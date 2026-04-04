"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanOrchestrator = void 0;
const supabase_1 = require("../lib/supabase");
const crawl_engine_1 = require("./crawl-engine");
const seo_analyzer_1 = require("./analyzers/seo-analyzer");
const accessibility_analyzer_1 = require("./analyzers/accessibility-analyzer");
const performance_analyzer_1 = require("./analyzers/performance-analyzer");
const security_analyzer_1 = require("./analyzers/security-analyzer");
const ux_analyzer_1 = require("./analyzers/ux-analyzer");
const broken_links_analyzer_1 = require("./analyzers/broken-links-analyzer");
const score_engine_1 = require("./score-engine");
class ScanOrchestrator {
    scanId;
    url;
    userId;
    config;
    constructor(scanId, url, userId, config) {
        this.scanId = scanId;
        this.url = url;
        this.userId = userId;
        this.config = config;
    }
    async run() {
        try {
            await this.emit('crawling', `Starting crawl of ${this.url}`);
            const crawler = new crawl_engine_1.CrawlEngine(this.url, this.config);
            const { pages, allLinks } = await crawler.start((msg) => {
                this.emit('crawling', msg);
            });
            await this.emit('analyzing', `Analyzing ${pages.length} pages and ${allLinks.length} links...`);
            let allIssues = [];
            const pageIds = {};
            for (const page of pages) {
                try {
                    // Create Page Record
                    const { data: pageRecord, error: pageErr } = await supabase_1.supabase
                        .from('pages')
                        .insert({
                        scan_id: this.scanId,
                        url: page.url,
                        status_code: page.status,
                        response_time_ms: page.response_time_ms,
                        screenshot_path: page.screenshot_path || null
                    })
                        .select()
                        .single();
                    if (pageErr) {
                        console.error(`[Orchestrator] Error saving page record for ${page.url}:`, pageErr);
                        continue;
                    }
                    pageIds[page.url] = pageRecord.id;
                    // Individual Analyzer calls with fault protection
                    try {
                        const pageIssues = [
                            ...(0, seo_analyzer_1.analyze)(page),
                            ...(0, accessibility_analyzer_1.analyze)(page),
                            ...(0, performance_analyzer_1.analyze)({ ...page, response_time_ms: page.response_time_ms }),
                            ...(0, security_analyzer_1.analyze)(page),
                            ...(0, ux_analyzer_1.analyze)(page)
                        ];
                        pageIssues.forEach(issue => {
                            issue.page_id = pageRecord.id;
                            issue.scan_id = this.scanId;
                        });
                        allIssues.push(...pageIssues);
                    }
                    catch (anaErr) {
                        console.error(`[Orchestrator] Analyzer failed for page ${page.url}:`, anaErr.message);
                    }
                }
                catch (pageGlobalErr) {
                    console.error(`[Orchestrator] Fatal page processing error for ${page.url}:`, pageGlobalErr.message);
                }
            }
            // Link Analysis (Internal vs External Status Checks Placeholder)
            try {
                const linksWithStatus = [];
                for (const link of allLinks) {
                    const status = pages.find(p => p.url === link.target)?.status || 200;
                    linksWithStatus.push({ ...link, status });
                }
                const linkIssues = (0, broken_links_analyzer_1.analyze)(linksWithStatus);
                linkIssues.forEach(issue => {
                    issue.scan_id = this.scanId;
                });
                allIssues.push(...linkIssues);
            }
            catch (linkErr) {
                console.error('[Orchestrator] Link analysis failed:', linkErr.message);
            }
            // Save all issues to DB
            if (allIssues.length > 0) {
                const { data: dbIssues, error: issueErr } = await supabase_1.supabase
                    .from('issues')
                    .insert(allIssues.map(i => {
                    const { id, ...rest } = i;
                    return {
                        ...rest,
                        scan_id: this.scanId
                    };
                }))
                    .select();
                if (issueErr)
                    console.error("[Orchestrator] Error saving issues:", issueErr);
                if (dbIssues) {
                    allIssues = dbIssues;
                }
            }
            // Calculate Scores
            let scores = { overall: 0 };
            try {
                scores = (0, score_engine_1.calculateScores)(allIssues);
                const { error: scoreErr } = await supabase_1.supabase
                    .from('scan_scores')
                    .insert({
                    ...scores,
                    scan_id: this.scanId
                });
                if (scoreErr)
                    console.error("[Orchestrator] Error saving scores:", scoreErr);
            }
            catch (scoreCalcErr) {
                console.error("[Orchestrator] Score calculation failed:", scoreCalcErr.message);
            }
            // AI Processing Stage
            await this.emit('ai_processing', `Running AI analysis on ${allIssues.length} issues across ${pages.length} pages...`);
            try {
                const { aiEngine } = await Promise.resolve().then(() => __importStar(require('./ai-engine')));
                const aiResults = await aiEngine.processAll(allIssues, scores, this.url, pages.length, async (pct) => {
                    // Broadcast granular progress
                    await this.emit('ai_progress', `Analyzing findings: ${pct}% complete`, { percentage: pct });
                });
                const explanationUpdates = [];
                allIssues.forEach(issue => {
                    if (issue.id) {
                        const explanation = aiResults.issueExplanations.get(issue.id);
                        if (explanation) {
                            explanationUpdates.push((async () => supabase_1.supabase.from('issues').update({
                                ai_explanation: explanation.explanation,
                                ai_why_it_matters: explanation.whyItMatters,
                                ai_how_to_fix: explanation.howToFix,
                                ai_code_snippet: explanation.codeSnippet,
                            }).eq('id', issue.id))());
                        }
                    }
                });
                await Promise.allSettled(explanationUpdates);
                await supabase_1.supabase.from('scan_scores').update({
                    ai_summary: aiResults.summary,
                    ai_executive_summary: aiResults.executiveSummary,
                    ai_priority_list: JSON.stringify(aiResults.priorityList),
                }).eq('scan_id', this.scanId);
            }
            catch (aiErr) {
                console.error('[Orchestrator] AI processing failed (non-fatal):', aiErr.message);
            }
            // Final Check: If we have NO data but the crawl supposedly ran
            if (pages.length === 0) {
                console.warn(`[Orchestrator] Crawl for ${this.url} returned zero pages.`);
                await this.emit('warning', `Discovery completed but no pages were reachable at ${this.url}`);
                // Fallback scores
                scores = {
                    overall: 100,
                    ai_summary: 'We were unable to reach any pages on this site. Please verify the URL and ensure the site is accessible from the internet.',
                    ai_executive_summary: 'Audit completed with no results because the target URL was unreachable.'
                };
                await supabase_1.supabase.from('scan_scores').insert({
                    ...scores,
                    scan_id: this.scanId
                });
            }
            // Wrap up
            await this.emit('complete', `Scan complete! Found ${allIssues.length} issues across ${pages.length} pages.`, {
                overall: scores.overall,
                pages: pages.length,
                issues: allIssues.length
            });
            await supabase_1.supabase
                .from('scans')
                .update({
                status: 'complete',
                overall_score: scores.overall,
                issue_count: allIssues.length,
                completed_at: new Date().toISOString()
            })
                .eq('id', this.scanId);
        }
        catch (err) {
            console.error("Orchestrator Fatal Error:", err);
            await this.emit('failed', `Scan failed: ${err.message}`);
            await supabase_1.supabase
                .from('scans')
                .update({ status: 'failed' })
                .eq('id', this.scanId);
        }
    }
    async emit(status, message, data = null) {
        console.log(`[SCAN EVENT][${status}]: ${message}`);
        const { error } = await supabase_1.supabase
            .from('scan_events')
            .insert({
            scan_id: this.scanId,
            event_type: status,
            message: message,
            data: data
        });
        if (error)
            console.error("Error emitting event:", error);
        // Update scan record status too
        await supabase_1.supabase
            .from('scans')
            .update({ status })
            .eq('id', this.scanId);
    }
}
exports.ScanOrchestrator = ScanOrchestrator;
