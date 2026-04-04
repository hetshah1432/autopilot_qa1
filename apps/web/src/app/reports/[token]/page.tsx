import { apiClient } from '@/lib/api'

// Public report page — no auth required
export default async function PublicReportPage({ params }: { params: { token: string } }) {
  let scan: any = null
  let isProcessing = false

  try {
    const response = await apiClient.reports.getPublic(params.token)
    scan = response
  } catch (err: any) {
    // Check if it's a 202 Processing response
    if (err.response?.status === 202 || err.message?.includes('Processing')) {
       isProcessing = true
    } else {
      return (
        <div className="min-h-screen bg-[#080810] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔍</div>
            <h1 className="text-2xl font-bold text-white">Report Not Found</h1>
            <p className="text-[#64748b]">This report link is invalid or has expired.</p>
            <a href="/" className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors">
              Start Free Audit
            </a>
          </div>
        </div>
      )
    }
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Finalizing Report...</h1>
          <p className="text-[#64748b] leading-relaxed">
            Our AI is currently performing the final analysis and generating your score breakdown. 
            This usually takes less than 30 seconds.
          </p>
          <div className="flex flex-col gap-3">
             <button onClick={() => {}} className="px-6 py-3 bg-[#1e1e2e] border border-[#2a2a3e] text-white font-bold rounded-xl opacity-50 cursor-not-allowed">
               Refreshing in 5s...
             </button>
             <p className="text-[10px] text-[#475569] uppercase font-black tracking-widest">Powered by Autopilot QA</p>
          </div>
          <script dangerouslySetInnerHTML={{ __html: `setTimeout(() => window.location.reload(), 5000)` }} />
        </div>
      </div>
    )
  }

  const rawScores = scan.scan_scores
  const scores = Array.isArray(rawScores) ? (rawScores[0] || {}) : (rawScores || {})
  const issues: any[] = scan.issues || []
  const pages: any[] = scan.pages || []
  const siteUrl = scan.projects?.url || ''
  const domain = (() => { try { return new URL(siteUrl).hostname } catch { return siteUrl } })()

  const SEV_TEXT: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    info: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const highCount = issues.filter(i => i.severity === 'high').length

  const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'
  const overall = scores.overall ?? 0

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Branding Header */}
      <header className="border-b border-[#1e1e2e] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-indigo-400">✦</span>
          Autopilot QA
        </div>
        <span className="text-xs text-[#64748b]">Shared Audit Report</span>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6 space-y-10">
        {/* Overview */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="w-8 h-8 rounded" />
            <h1 className="text-3xl font-bold">{domain}</h1>
          </div>

          <svg width={140} height={140} className="mx-auto">
            <circle cx={70} cy={70} r={58} fill="none" stroke="#1e1e2e" strokeWidth={10} />
            <circle cx={70} cy={70} r={58} fill="none" stroke={scoreColor(overall)} strokeWidth={10}
              strokeDasharray={2 * Math.PI * 58}
              strokeDashoffset={2 * Math.PI * 58 - (overall / 100) * (2 * Math.PI * 58)}
              strokeLinecap="round" transform="rotate(-90 70 70)" />
            <text x={70} y={78} textAnchor="middle" fill={scoreColor(overall)} fontWeight="bold" fontSize={30}>{overall}</text>
          </svg>

          <div className="flex gap-4 justify-center flex-wrap text-sm">
            <span className="px-4 py-2 bg-[#1e1e2e] rounded-xl">{pages.length} pages scanned</span>
            <span className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">{criticalCount} critical</span>
            <span className="px-4 py-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">{highCount} high</span>
            <span className="px-4 py-2 bg-[#1e1e2e] rounded-xl">{issues.length} total issues</span>
          </div>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            ['SEO', scores.seo], ['Accessibility', scores.accessibility],
            ['Performance', scores.performance], ['Security', scores.security],
            ['UX', scores.ux], ['Broken Links', scores.broken_links],
          ].map(([label, score]) => (
            <div key={label as string} className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 text-center">
              <p className="text-xs text-[#64748b] font-bold uppercase tracking-widest mb-2">{label}</p>
              <p className="text-3xl font-bold" style={{ color: scoreColor(Number(score) || 0) }}>{score ?? '—'}</p>
            </div>
          ))}
        </div>


        {/* Top Issues */}
        <div>
          <h2 className="text-xl font-bold mb-6">Top Issues</h2>
          <div className="space-y-3">
            {issues
              .sort((a, b) => {
                const o: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
                return (o[a.severity] ?? 5) - (o[b.severity] ?? 5)
              })
              .slice(0, 15)
              .map(issue => (
                <div key={issue.id} className="bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${SEV_TEXT[issue.severity] || ''}`}>
                      {issue.severity}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{issue.title}</p>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-[#1e1e2e] mt-16 py-12 text-center space-y-4">
        <p className="text-[#64748b] text-sm">Powered by Autopilot QA</p>
        <a
          href="/"
          className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
        >
          Start Your Free Audit →
        </a>
      </footer>
    </div>
  )
}
