"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiEngine = exports.aiProvider = exports.aiQueue = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
// ─── Rate Limiter ─────────────────────────────────────────────────────────────
class AIQueue {
    queue = [];
    running = false;
    lastCallTime = 0;
    minGapMs = 1500; // 1.5s gap for Groq (very fast compared to Gemini)
    async enqueue(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    resolve(await fn());
                }
                catch (e) {
                    reject(e);
                }
            });
            this.process();
        });
    }
    async process() {
        if (this.running || this.queue.length === 0)
            return;
        this.running = true;
        while (this.queue.length > 0) {
            const now = Date.now();
            const elapsed = now - this.lastCallTime;
            if (elapsed < this.minGapMs) {
                await sleep(this.minGapMs - elapsed);
            }
            const fn = this.queue.shift();
            this.lastCallTime = Date.now();
            await fn();
        }
        this.running = false;
    }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
exports.aiQueue = new AIQueue();
// ─── Groq Provider ────────────────────────────────────────────────────────────
class GroqProvider {
    groq;
    constructor() {
        this.groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY || '' });
    }
    async generateText(prompt, maxTokens = 1024) {
        let lastErr;
        const delays = [1000, 2000, 4000];
        for (let attempt = 0; attempt <= 3; attempt++) {
            try {
                const response = await this.groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.3,
                    max_tokens: maxTokens,
                });
                return response.choices[0]?.message?.content || '';
            }
            catch (err) {
                lastErr = err;
                const is429 = err?.status === 429 || err?.message?.includes('429');
                if (is429) {
                    console.warn('[Groq] Rate limited. Waiting 30s…');
                    await sleep(30000);
                    continue;
                }
                if (attempt < delays.length) {
                    await sleep(delays[attempt]);
                    continue;
                }
                break;
            }
        }
        throw lastErr;
    }
    stripJsonFences(text) {
        return text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
    }
}
exports.aiProvider = new GroqProvider();
// ─── AI Engine ────────────────────────────────────────────────────────────────
class AIEngine {
    provider;
    constructor() {
        this.provider = exports.aiProvider;
    }
    async processAll(issues, scores, siteUrl, pageCount, onProgress) {
        console.log(`[AIEngine] Starting AI processing via Groq for ${siteUrl} — ${issues.length} issues`);
        const [summary, executiveSummary, priorityList] = await Promise.all([
            this.generateSummary(scores, issues, siteUrl, pageCount),
            this.generateExecutiveSummary(scores, issues, siteUrl),
            this.generatePriorityList(issues),
        ]);
        const issueExplanations = await this.generateIssueExplanations(issues, siteUrl, onProgress);
        return { issueExplanations, summary, executiveSummary, priorityList };
    }
    repairJson(text) {
        let repaired = text.trim();
        // 1. Remove trailing commas in arrays/objects
        repaired = repaired.replace(/,\s*([\]}])/g, '$1');
        // 2. Handle common unescaped quotes (heuristic)
        // This is simple but helps with common AI slips
        return repaired;
    }
    async generateIssueExplanations(issues, siteUrl, onProgress) {
        const filtered = issues.filter(i => ['critical', 'high', 'medium'].includes(i.severity));
        const results = new Map();
        const batches = [];
        for (let i = 0; i < filtered.length; i += 6) {
            batches.push(filtered.slice(i, i + 6));
        }
        let completed = 0;
        for (const batch of batches) {
            await exports.aiQueue.enqueue(async () => {
                const prompt = `You are a web quality expert. Site: ${siteUrl}
Analyze these issues and return a JSON array:
${JSON.stringify(batch.map(i => ({ id: i.id, title: i.title, description: i.description })))}

Format: [{"id":"id","explanation":"...","whyItMatters":"...","howToFix":"...","codeSnippet":"..."}]
CRITICAL: Respond ONLY with valid JSON. Escape all internal quotes.`;
                try {
                    let raw = this.provider.stripJsonFences(await this.provider.generateText(prompt, 1536));
                    raw = this.repairJson(raw);
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item) => {
                            if (item.id)
                                results.set(item.id, item);
                        });
                    }
                }
                catch (e) {
                    console.warn('[AIEngine] Batch parse failed, skipping:', e.message);
                }
                finally {
                    completed++;
                    onProgress(Math.round((completed / batches.length) * 100));
                }
            });
        }
        return results;
    }
    async generateSummary(scores, issues, siteUrl, pageCount) {
        const counts = this.countBySeverity(issues);
        const top5 = issues.slice(0, 5).map(i => `${i.category} - ${i.title}`).join('\n');
        const prompt = `Write a professional developer summary.
Site: ${siteUrl}
Pages: ${pageCount}
Scores: SEO:${scores.seo ?? '?'} A11y:${scores.accessibility ?? '?'} Perf:${scores.performance ?? '?'} Sec:${scores.security ?? '?'} Overall:${scores.overall ?? '?'}
Crit: ${counts.critical} High: ${counts.high}
Top issues: ${top5}

Write: 1) Health state, 2) Top 3 fix priorities, 3) Effort (Low/Med/High). Clear technical tone. Max 200 words.`;
        return exports.aiQueue.enqueue(() => this.provider.generateText(prompt, 512));
    }
    async generateExecutiveSummary(scores, issues, siteUrl) {
        const top3 = issues.filter(i => i.severity === 'critical' || i.severity === 'high').slice(0, 3).map(i => i.title).join(', ');
        const prompt = `Write a business summary. Site: ${siteUrl}, Score: ${scores.overall}/100. Issues: ${top3}. 
    Focus on business risk and priority action. No technical jargon. Max 100 words.`;
        return exports.aiQueue.enqueue(() => this.provider.generateText(prompt, 256));
    }
    async generatePriorityList(issues) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        const top20 = [...issues]
            .sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5))
            .slice(0, 15);
        const prompt = `Prioritize these issues as a JSON array:
    ${JSON.stringify(top20.map(i => ({ id: i.id, title: i.title, severity: i.severity })))}
    [{"issueId":"id","priority":1,"rationale":"why","estimatedEffort":"effort"}]
    Max 10 items. No markdown.`;
        return exports.aiQueue.enqueue(async () => {
            try {
                const raw = this.provider.stripJsonFences(await this.provider.generateText(prompt, 1024));
                return JSON.parse(raw);
            }
            catch {
                return [];
            }
        });
    }
    async generateFixCode(issue) {
        const prompt = `Generate a code fix for: ${issue.title} (${issue.category}).
    Return ONLY JSON: {"before":"code","after":"code","explanation":"text","language":"html|css|js|react"}`;
        return exports.aiQueue.enqueue(async () => {
            const raw = this.provider.stripJsonFences(await this.provider.generateText(prompt, 1024));
            return JSON.parse(raw);
        });
    }
    async chat(messages, context) {
        const topIssues = context.topIssues.slice(0, 10).map(i => `${i.severity.toUpperCase()} [${i.category}] ${i.title}`).join('\n');
        const systemContext = `You are Autopilot QA Assistant. Analyze ${context.siteUrl} (Score: ${context.scores.overall}/100).
    Issues:\n${topIssues}\nSummary: ${context.aiSummary}. Be helpful, technical, max 150 words.`;
        const groqMessages = [
            { role: 'system', content: systemContext },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];
        return exports.aiQueue.enqueue(async () => {
            const res = await this.provider['groq'].chat.completions.create({
                messages: groqMessages,
                model: 'llama-3.3-70b-versatile',
                temperature: 0.5,
                max_tokens: 512,
            });
            return res.choices[0]?.message?.content || '';
        });
    }
    countBySeverity(issues) {
        return issues.reduce((acc, i) => {
            acc[i.severity] = (acc[i.severity] || 0) + 1;
            return acc;
        }, {});
    }
}
exports.aiEngine = new AIEngine();
