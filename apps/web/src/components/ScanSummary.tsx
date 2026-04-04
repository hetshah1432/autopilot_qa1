import { Search, AlertTriangle, Clock } from "lucide-react"
import { cn } from "utils"

export function ScanSummary({ latestScan }: any) {
   if (!latestScan) return (
      <div className="p-10 text-center italic text-muted">No scan history recorded.</div>
   )
   
   const rawScores = latestScan.scan_scores
   const scanScores = Array.isArray(rawScores) ? rawScores[0] : rawScores || {}

   const summary = scanScores.ai_executive_summary || ''
   const isRateLimited = summary.includes('token limit') || summary.includes('rate limit') ||
      (scanScores.ai_summary || '').includes('token limit')

   return (
      <div className="space-y-4">
         {/* Rate Limit Alert (Conditional) */}
         {isRateLimited && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-3xl">
               <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                     <h4 className="font-bold text-amber-300 text-sm mb-1">AI Context Limited</h4>
                     <p className="text-xs text-amber-200/80 leading-relaxed">
                        The Groq daily token limit (100,000 tokens/day) was reached. 
                        AI summaries will resume after the quota resets in 24 hours.
                     </p>
                  </div>
               </div>
            </div>
         )}

         <div className="grid grid-cols-2 gap-4 pt-2">
            <MetricCard label="SEO Score" value={scanScores.seo} />
            <MetricCard label="Performance" value={scanScores.performance} />
            <MetricCard label="Accessibility" value={scanScores.accessibility} />
            <MetricCard label="Security" value={scanScores.security} />
         </div>
      </div>
   )
}

function MetricCard({ label, value }: any) {
  const hasValue = value !== null && value !== undefined
  return (
    <div className="p-4 bg-white/5 rounded-2xl border border-border">
       <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-1">{label}</p>
       <p className={cn("text-xl font-extrabold", !hasValue && "text-muted")}>
          {hasValue ? `${Math.round(value)}%` : '--'}
       </p>
    </div>
  )
}
