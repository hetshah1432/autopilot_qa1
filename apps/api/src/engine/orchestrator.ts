import { supabase } from '../lib/supabase';
import { CrawlEngine, ScanConfig, PageData, LinkData } from './crawl-engine';
import { analyze as seoAnalyze } from './analyzers/seo-analyzer';
import { analyze as a11yAnalyze } from './analyzers/accessibility-analyzer';
import { analyze as perfAnalyze } from './analyzers/performance-analyzer';
import { analyze as securityAnalyze } from './analyzers/security-analyzer';
import { analyze as uxAnalyze } from './analyzers/ux-analyzer';
import { analyze as linksAnalyze } from './analyzers/broken-links-analyzer';
import { calculateScores } from './score-engine';
import { Issue, ScanScore, CategoryStatus } from 'types';

export class ScanOrchestrator {
  private scanId: string;
  private url: string;
  private userId: string;
  private config: ScanConfig;

  constructor(scanId: string, url: string, userId: string, config: ScanConfig) {
    this.scanId = scanId;
    this.url = url;
    this.userId = userId;
    this.config = config;
  }

  async run() {
    try {
      await this.emit('crawling', `Starting crawl of ${this.url}`);
      
      const crawler = new CrawlEngine(this.url, this.config);
      const { pages, allLinks, summary } = await crawler.start((msg) => {
         this.emit('crawling', msg);
      });

      await this.emit('analyzing', `Analyzing ${pages.length} pages and ${allLinks.length} links...`);
      
      let allIssues: Issue[] = [];
      const pageUrlToId: Record<string, string> = {};
      const scanPageIds: string[] = [];
      
      const { classifyPage } = await import('./page-classifier');

      const categoryStatuses: Record<string, CategoryStatus> = {
         seo: 'ok',
         accessibility: 'ok',
         performance: 'ok',
         security: 'ok',
         ux: 'ok',
         broken_links: 'ok'
      };

      for (const page of pages) {
         try {
            const role = classifyPage(page.url, page.html);

            const { data: pageRecord, error: pageErr } = await supabase
               .from('pages')
               .insert({
                  scan_id: this.scanId,
                  url: page.url,
                  status_code: page.status,
                  response_time_ms: page.response_time_ms,
                  screenshot_path: page.screenshot_path || null,
                  crawl_status: page.crawl_status,
                  blocked: page.blocked,
                  block_reason: page.block_reason
               })
               .select()
               .single();

            if (pageErr) {
               console.error(`[Orchestrator] Error saving page record for ${page.url}:`, pageErr);
               continue;
            }
            
            if (pageRecord) {
               scanPageIds.push(pageRecord.id);
               pageUrlToId[page.url] = pageRecord.id;
            }

            if (!page.blocked) {
               const runAnalyzer = (fn: any, cat: string) => {
                  try {
                     return fn();
                  } catch (err: any) {
                     console.error(`[Orchestrator] ${cat} analyzer failed for ${page.url}:`, err.message);
                     categoryStatuses[cat] = 'analyzer_failed';
                     return [];
                  }
               };

               const pageIssues = [
                  ...runAnalyzer(() => seoAnalyze(page, role), 'seo'),
                  ...runAnalyzer(() => a11yAnalyze(page, role), 'accessibility'),
                  ...runAnalyzer(() => perfAnalyze({ ...page, response_time_ms: page.response_time_ms }, role), 'performance'),
                  ...runAnalyzer(() => securityAnalyze(page, role), 'security'),
                  ...runAnalyzer(() => uxAnalyze(page, role), 'ux')
               ];

               pageIssues.forEach(issue => {
                  issue.page_id = pageRecord.id;
                  issue.scan_id = this.scanId;
               });
               allIssues.push(...pageIssues);
            } else if (page.crawl_status !== 'robots_disallowed') {
                try {
                  const securityIssues = securityAnalyze(page, role);
                  securityIssues.forEach(issue => {
                     issue.page_id = pageRecord.id;
                     issue.scan_id = this.scanId;
                  });
                  allIssues.push(...securityIssues);
                } catch (e) {
                   categoryStatuses.security = 'analyzer_failed';
                }
            }
         } catch (pageErr: any) {
            console.error(`[Orchestrator] Fatal page processing error for ${page.url}:`, pageErr.message);
         }
      }

      // ─── INTELLIGENT GROUPING ───
      const groupedIssues: Issue[] = [];
      const seenGroupKeys = new Map<string, Issue>();

      allIssues.forEach(issue => {
          const groupKey = issue.scope === 'sitewide' 
             ? `${issue.category}:${issue.subcategory}:sitewide`
             : `${issue.category}:${issue.subcategory}:${issue.page_role}`;

          if (issue.scope === 'sitewide' || (issue.subcategory && ['meta_description', 'title_length', 'canonical'].includes(issue.subcategory))) {
             if (seenGroupKeys.has(groupKey)) {
                const existing = seenGroupKeys.get(groupKey)!;
                existing.affected_pages_count = (existing.affected_pages_count || 1) + 1;
                return;
             } else {
                issue.affected_pages_count = 1;
                seenGroupKeys.set(groupKey, issue);
                groupedIssues.push(issue);
             }
          } else {
             groupedIssues.push(issue);
          }
      });
      allIssues = groupedIssues;

      // Link Analysis
      try {
         const linksWithStatus: any[] = [];
         for (const link of allLinks) {
            const status = pages.find(p => p.url === link.target)?.status || 200;
            linksWithStatus.push({ ...link, status });
         }
         const linkIssues = linksAnalyze(linksWithStatus);
         linkIssues.forEach(issue => {
            issue.scan_id = this.scanId;
            issue.detection_type = 'deterministic';
            issue.confidence = 1.0;
            issue.scope = 'page';
         });
         allIssues.push(...linkIssues);
      } catch (linkErr: any) {
         console.error('[Orchestrator] Link analysis failed:', linkErr.message);
         categoryStatuses.broken_links = 'analyzer_failed';
      }

      // ATOMIC PERSISTENCE
      let issuesSaved = false;
      if (allIssues.length > 0) {
         const { data: dbIssues, error: issueErr } = await supabase
            .from('issues')
            .insert(allIssues.map(i => {
               const { id, ...rest } = i;
               return { ...rest, scan_id: this.scanId };
            }))
            .select();

         if (issueErr) {
             console.error("[Orchestrator] FATAL ERROR: Issues failed to save:", issueErr);
         } else if (dbIssues) {
            allIssues = dbIssues;
            issuesSaved = true;
         }
      } else {
         issuesSaved = true;
      }

      let scores: Partial<ScanScore> = { overall: 0 };
      try {
         scores = calculateScores(allIssues, scanPageIds, categoryStatuses);
         await supabase.from('scan_scores').insert({ ...scores, scan_id: this.scanId });
      } catch (scoreCalcErr: any) {
         console.error("[Orchestrator] Score calculation/save failed:", scoreCalcErr.message);
      }

      // INVARIANT ENFORCEMENT
      let scanCompletionStatus: 'complete' | 'completed_with_errors' = 'complete';
      const inconsistencies: string[] = [];

      ['seo', 'accessibility', 'performance', 'security', 'ux', 'broken_links'].forEach(cat => {
         const score = (scores as any)[cat];
         const status = categoryStatuses[cat];
         const catIssues = allIssues.filter(i => i.category === cat);
         if (status === 'ok' && score !== null && score < 100 && catIssues.length === 0) {
            scanCompletionStatus = 'completed_with_errors';
            inconsistencies.push(`Category ${cat} is penalized (${score}) but has 0 saved issues.`);
         }
      });

      if (!issuesSaved && allIssues.length > 0) {
          scanCompletionStatus = 'completed_with_errors';
          inconsistencies.push("Issues were generated but failed to persist to the database.");
      }

      // AI Processing
      await this.emit('ai_processing', `Running AI analysis on ${allIssues.length} findings...`);
      try {
        const { aiEngine } = await import('./ai-engine');
        const aiResults = await aiEngine.processAll(allIssues, scores, this.url, pages.length, summary?.reportMode || 'full', async (pct) => {
             await this.emit('ai_progress', `Analyzing findings: ${pct}% complete`, { percentage: pct });
        });

        const explanationUpdates: Promise<any>[] = [];
        allIssues.forEach(issue => {
          if (issue.id) {
            const explanation = aiResults.issueExplanations.get(issue.id);
            if (explanation) {
              explanationUpdates.push(
                (async () => supabase.from('issues').update({
                  ai_explanation: explanation.explanation,
                  ai_why_it_matters: explanation.whyItMatters,
                  ai_how_to_fix: explanation.howToFix,
                  ai_code_snippet: explanation.codeSnippet,
                }).eq('id', issue.id as string))()
              );
            }
          }
        });
        await Promise.allSettled(explanationUpdates);

        await supabase.from('scan_scores').update({
          ai_summary: aiResults.summary,
          ai_executive_summary: aiResults.executiveSummary,
          ai_priority_list: JSON.stringify(aiResults.priorityList),
        }).eq('scan_id', this.scanId);

      } catch (aiErr: any) {
        console.error('[Orchestrator] AI processing failed (non-fatal):', aiErr.message);
      }

      // Final Status Update
      await supabase
         .from('scans')
         .update({ 
            status: scanCompletionStatus, 
            overall_score: scores.overall, 
            issue_count: allIssues.length,
            completed_at: new Date().toISOString(),
            report_mode: summary?.reportMode || 'full',
            crawl_limitations: summary || null
         })
         .eq('id', this.scanId);

      await this.emit(scanCompletionStatus, `Scan complete! Found ${allIssues.length} issues across ${pages.length} pages.`, { 
         overall: scores.overall,
         pages: pages.length,
         issues: allIssues.length,
         inconsistencies
      });

    } catch (err: any) {
      console.error("Orchestrator Fatal Error:", err);
      await supabase.from('scans').update({ status: 'failed' }).eq('id', this.scanId);
      try { await this.emit('failed', `Scan failed: ${err.message}`); } catch {}
    }
  }

  private async emit(status: string, message: string, data: any = null) {
      // Guard: verify this scan still exists before emitting (prevents FK constraint errors)
      const { data: scanExists } = await supabase
         .from('scans')
         .select('id')
         .eq('id', this.scanId)
         .maybeSingle();
      
      if (!scanExists) {
         console.warn(`[Orchestrator] Skipping emit — scan ${this.scanId} no longer exists.`);
         return;
      }

      console.log(`[SCAN EVENT][${status}]: ${message}`);
      const { error } = await supabase
         .from('scan_events')
         .insert({
            scan_id: this.scanId,
            event_type: status,
            message,
            data
         });
      
      if (error) console.error("Error emitting event:", error);

      // Keep scans.status on meaningful milestones only (not per-AI-percent ticks)
      const skipScanStatusUpdate =
        ['complete', 'failed', 'completed_with_errors', 'ai_progress'].includes(status)

      if (!skipScanStatusUpdate) {
        await supabase
           .from('scans')
           .update({ status })
           .eq('id', this.scanId);
      }
  }
}
