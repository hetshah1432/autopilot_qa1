import Groq from 'groq-sdk'
import { Issue, ScanScore } from 'types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIProvider {
  generateText(prompt: string, maxTokens?: number): Promise<string>
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ScanContext {
  siteUrl: string
  scores: Partial<ScanScore>
  topIssues: Issue[]
  aiSummary: string
}

export interface FixCodeResult {
  before: string
  after: string
  explanation: string
  language: 'html' | 'css' | 'javascript' | 'react'
}

export interface AiResults {
  issueExplanations: Map<string, { explanation: string; whyItMatters: string; howToFix: string; codeSnippet: string }>
  summary: string
  executiveSummary: string
  priorityList: Array<{ issueId: string; priority: number; rationale: string; estimatedEffort: string }>
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

class AIQueue {
  private queue: Array<() => Promise<any>> = []
  private running = false
  private lastCallTime = 0
  private readonly minGapMs = 1500 // 1.5s gap for Groq (very fast compared to Gemini)

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn())
        } catch (e) {
          reject(e)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.running || this.queue.length === 0) return
    this.running = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const elapsed = now - this.lastCallTime
      if (elapsed < this.minGapMs) {
        await sleep(this.minGapMs - elapsed)
      }

      const fn = this.queue.shift()!
      this.lastCallTime = Date.now()
      await fn()
    }

    this.running = false
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export const aiQueue = new AIQueue()

// ─── Groq Provider ────────────────────────────────────────────────────────────

class GroqProvider implements AIProvider {
  private groq: Groq
  // Model fallback chain: each model has its own separate daily quota on Groq
  private readonly modelChain = [
    'llama-3.3-70b-versatile',   // Primary:  100K tokens/day free
    'llama-3.1-8b-instant',      // Fallback: 500K tokens/day free (faster, smaller)
    'gemma2-9b-it',              // Last resort: also has its own separate TPD limit
  ]
  private currentModelIndex = 0

  get currentModel() { return this.modelChain[this.currentModelIndex] }

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
  }

  async generateText(prompt: string, maxTokens = 1024): Promise<string> {
    const delays = [1000, 2000, 4000]

    while (this.currentModelIndex < this.modelChain.length) {
      let lastErr: any

      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          const response = await this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: this.currentModel,
            temperature: 0.3,
            max_tokens: maxTokens,
          })
          return response.choices[0]?.message?.content || ''
        } catch (err: any) {
          lastErr = err
          const errBody = JSON.stringify(err?.error || err?.message || err || '')
          const is429 = err?.status === 429 || errBody.includes('429')

          if (is429) {
            const isDailyLimit = errBody.includes('tokens per day') || errBody.includes('TPD') || errBody.includes('day')
            
            if (isDailyLimit) {
              // Try the next model in the chain
              this.currentModelIndex++
              if (this.currentModelIndex < this.modelChain.length) {
                const nextModel = this.modelChain[this.currentModelIndex]
                console.warn(`[Groq] TPD exhausted on ${this.modelChain[this.currentModelIndex - 1]}. Switching to fallback model: ${nextModel}`)
                break // break inner loop, while loop will retry with new model
              } else {
                // All models exhausted
                throw new Error(`rate_limit_daily: All Groq models exhausted their daily token limits. ${errBody}`)
              }
            }

            // Per-minute rate limit — worth waiting and retrying (max 2 times)
            if (attempt < 2) {
              console.warn(`[Groq] Per-minute rate limit on ${this.currentModel}. Waiting 30s… (attempt ${attempt + 1}/2)`)
              await sleep(30000)
              continue
            }
            throw lastErr
          }

          if (attempt < delays.length) {
            await sleep(delays[attempt])
            continue
          }
          break
        }
      }

      // If we broke out due to model switch, retry from top of while loop
      if (this.currentModelIndex < this.modelChain.length && lastErr) {
        continue
      }
      if (lastErr) throw lastErr
    }

    throw new Error('rate_limit_daily: No Groq models available.')
  }

  stripJsonFences(text: string): string {
    return text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
  }
}

export const aiProvider = new GroqProvider()

// ─── AI Engine ────────────────────────────────────────────────────────────────

class AIEngine {
  private provider: GroqProvider

  constructor() {
    this.provider = aiProvider as GroqProvider
  }

  async processAll(
    issues: Issue[],
    scores: Partial<ScanScore>,
    siteUrl: string,
    pageCount: number,
    reportMode?: string,
    onProgress?: (pct: number) => void
  ): Promise<AiResults> {
    console.log(`[AIEngine] Starting AI processing via Groq for ${siteUrl} — ${issues.length} issues`)

    const [summary, executiveSummary, priorityList] = await Promise.all([
      this.generateSummary(scores, issues, siteUrl, pageCount, reportMode),
      this.generateExecutiveSummary(scores, issues, siteUrl, reportMode),
      this.generatePriorityList(issues),
    ])

    const issueExplanations = await this.generateIssueExplanations(issues, siteUrl, onProgress || (() => {}))

    return { issueExplanations, summary, executiveSummary, priorityList }
  }

  private extractJson(text: string): string {
    const startBracket = text.indexOf('[');
    const endBracket = text.lastIndexOf(']');
    if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
      return text.substring(startBracket, endBracket + 1);
    }
    const startBrace = text.indexOf('{');
    const endBrace = text.lastIndexOf('}');
    if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
      return text.substring(startBrace, endBrace + 1);
    }
    return text;
  }

  private repairJson(text: string): string {
    let repaired = text.trim();
    // 1. Remove trailing commas in arrays/objects
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');
    // 2. Escape unescaped backslashes (not followed by common escape chars)
    repaired = repaired.replace(/\\(?![bfnrtu"\/])/g, '\\\\');
    return repaired;
  }

  async generateIssueExplanations(issues: Issue[], siteUrl: string, onProgress: (pct: number) => void) {
    const filtered = issues.filter(i => ['critical', 'high', 'medium'].includes(i.severity))
    const results = new Map<string, { explanation: string; whyItMatters: string; howToFix: string; codeSnippet: string }>()

    const batches: Issue[][] = []
    for (let i = 0; i < filtered.length; i += 6) {
      batches.push(filtered.slice(i, i + 6))
    }

    let completed = 0;
    for (const batch of batches) {
      await aiQueue.enqueue(async () => {
        const prompt = `You are a web quality expert. Site: ${siteUrl}
Analyze these issues and return a JSON array:
${JSON.stringify(batch.map(i => ({ id: i.id, title: i.title, description: i.description })))}

Format: [{"id":"id","explanation":"...","whyItMatters":"...","howToFix":"...","codeSnippet":"..."}]
CRITICAL: Respond ONLY with valid JSON. 
CRITICAL: If you include code snippets in the "codeSnippet" field, use SINGLE QUOTES ' for attributes or ESCAPE double quotes with \\".
CRITICAL: Do NOT include markdown formatting outside the JSON.`

        try {
          const rawText = await this.provider.generateText(prompt, 2048);
          let raw = this.extractJson(this.provider.stripJsonFences(rawText));
          raw = this.repairJson(raw);
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item.id) results.set(item.id, item)
            })
          }
        } catch (e: any) {
          console.warn('[AIEngine] Batch parse failed, skipping:', e.message)
        } finally {
          completed++;
          onProgress(Math.round((completed / batches.length) * 100));
        }
      })
    }

    return results
  }

  async generateSummary(scores: Partial<ScanScore>, issues: Issue[], siteUrl: string, pageCount: number, reportMode?: string): Promise<string> {
    const counts = this.countBySeverity(issues)
    const top5 = issues.slice(0, 5).map(i => `${i.category} - ${i.title}`).join('\n')
    
    const analyzableCount = Array.from(new Set(issues.map(i => i.page_id))).length;
    const crawlContext = reportMode === 'owner_assisted'
      ? `\n[NOTE]: This audit includes content MANUALLY provided by the site owner because the automated crawl was restricted. Acknowledge this contribution professionally.`
      : pageCount > analyzableCount 
      ? `\n[NOTE]: This audit was partially LIMITED. We discovered ${pageCount} pages but could only analyze ${analyzableCount} due to bot protection or robots.txt. Mention this limitation honestly.`
      : "";

    const prompt = `Write a professional developer summary.
Site: ${siteUrl}
Pages Analyzed: ${analyzableCount} of ${pageCount}${crawlContext}
Scores: SEO:${scores.seo??'?'} A11y:${scores.accessibility??'?'} Perf:${scores.performance??'?'} Sec:${scores.security??'?'} Overall:${scores.overall??'?'}
Crit: ${counts.critical} High: ${counts.high}
Top issues: ${top5}

Write: 1) Health state (acknowledge limited crawl if applicable), 2) Top 3 fix priorities, 3) Effort. Clear technical tone. Max 200 words.`

    return aiQueue.enqueue(() => this.provider.generateText(prompt, 512))
  }

  async generateExecutiveSummary(scores: Partial<ScanScore>, issues: Issue[], siteUrl: string, reportMode?: string): Promise<string> {
    const top3 = issues.filter(i => i.severity === 'critical' || i.severity === 'high').slice(0, 3).map(i => i.title).join(', ')
    const analyzableCount = Array.from(new Set(issues.map(i => i.page_id))).length;
    
    const prompt = `Write a business summary. Site: ${siteUrl}, Score: ${scores.overall}/100. 
    Pages fully analyzed: ${analyzableCount}.
    Report Mode: ${reportMode || 'standard'}.
    Top Issues: ${top3}. 
    Focus on business risk and priority action. ${reportMode === 'owner_assisted' ? 'Acknowledge the owner-provided content.' : 'If coverage was limited, mention it as a risk.'} No technical jargon. Max 100 words.`
    return aiQueue.enqueue(() => this.provider.generateText(prompt, 256))
  }

  async generatePriorityList(issues: Issue[]): Promise<Array<{ issueId: string; priority: number; rationale: string; estimatedEffort: string }>> {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
    const top20 = [...issues]
      .sort((a, b) => (severityOrder[a.severity as keyof typeof severityOrder] ?? 5) - (severityOrder[b.severity as keyof typeof severityOrder] ?? 5))
      .slice(0, 15)

    const prompt = `You are a Senior QA Engineer. Analyze these issues and prioritize the top 10 most critical fixes.
    Input Issues:
    ${JSON.stringify(top20.map(i => ({ id: i.id, title: i.title, severity: i.severity })))}
    
    Return a strictly valid JSON array of objects. 
    Format example (STRUCTURE ONLY): 
    [{"issueId":"id","priority":1,"rationale":"Explain WHY this is a priority based on the title","estimatedEffort":"30min|2hrs|1day|1week"}]
    
    IMPORTANT: Provide unique, site-specific rationale for EVERY item. Do NOT use placeholder text like "why" or "effort".`

    return aiQueue.enqueue(async () => {
      try {
        const raw = this.provider.stripJsonFences(await this.provider.generateText(prompt, 1024))
        return JSON.parse(raw)
      } catch { return [] }
    })
  }

  async generateFixCode(issue: Issue): Promise<FixCodeResult> {
    const prompt = `Generate a code fix for: ${issue.title} (${issue.category}).
    Return ONLY JSON: {"before":"code","after":"code","explanation":"text","language":"html|css|js|react"}`
    return aiQueue.enqueue(async () => {
      const raw = this.provider.stripJsonFences(await this.provider.generateText(prompt, 1024))
      return JSON.parse(raw)
    })
  }

  async chat(messages: ChatMessage[], context: ScanContext): Promise<string> {
    const topIssues = context.topIssues.slice(0, 10).map(i => `${i.severity.toUpperCase()} [${i.category}] ${i.title}`).join('\n')
    const systemContext = `You are Autopilot QA Assistant. Analyze ${context.siteUrl} (Score: ${context.scores.overall}/100).
    Issues:\n${topIssues}\nSummary: ${context.aiSummary}. Be helpful, technical, max 150 words.`

    const groqMessages = [
      { role: 'system' as const, content: systemContext },
      ...messages.map(m => ({ role: m.role as any, content: m.content }))
    ]

    return aiQueue.enqueue(async () => {
      const res = await (this.provider as any)['groq'].chat.completions.create({
        messages: groqMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 512,
      })
      return res.choices[0]?.message?.content || ''
    })
  }

  private countBySeverity(issues: Issue[]) {
    return issues.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

export const aiEngine = new AIEngine()
