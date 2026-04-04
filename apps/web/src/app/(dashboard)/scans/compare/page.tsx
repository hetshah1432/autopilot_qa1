'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageLoader } from '@/components/ui/Feedback'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { cn } from 'utils'
import { format } from 'date-fns'

function ComparePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const a = searchParams.get('a')
  const b = searchParams.get('b')
  const { session } = useAuth()

  const { data: scanA, isLoading: loadingA } = useQuery({
     queryKey: ['scan', a],
     queryFn: () => apiClient.scans.get(a!, session?.access_token || ''),
     enabled: !!a && !!session?.access_token
  })

  const { data: scanB, isLoading: loadingB } = useQuery({
     queryKey: ['scan', b],
     queryFn: () => apiClient.scans.get(b!, session?.access_token || ''),
     enabled: !!b && !!session?.access_token
  })

  if (loadingA || loadingB) return <PageLoader />
  if (!scanA || !scanB) return <div className="p-8 text-center">Scans not found</div>

  const scoresA = scanA.scan_scores?.[0] || {}
  const scoresB = scanB.scan_scores?.[0] || {}

  const categories = [
    { key: 'overall', label: 'Overall Score' },
    { key: 'seo', label: 'SEO' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'performance', label: 'Performance' },
    { key: 'security', label: 'Security' },
    { key: 'ux', label: 'UX' },
    { key: 'broken_links', label: 'Links' },
  ]

  const getDelta = (key: string) => {
    const valA = scoresA[key] || 0
    const valB = scoresB[key] || 0
    const delta = valB - valA
    return {
      value: delta,
      node: delta > 0 ? (
        <span className="text-green-400 flex items-center gap-1 font-bold">
          <TrendingUp className="w-3 h-3" /> ↑+{delta}
        </span>
      ) : delta < 0 ? (
        <span className="text-red-400 flex items-center gap-1 font-bold">
          <TrendingDown className="w-3 h-3" /> ↓{delta}
        </span>
      ) : (
        <span className="text-muted flex items-center gap-1">
          <Minus className="w-3 h-3" /> =
        </span>
      )
    }
  }

  const improved = (scoresB.overall || 0) > (scoresA.overall || 0)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-12">
      <div className="flex items-center justify-between">
        <button 
           onClick={() => router.back()}
           className="p-2 -ml-2 text-muted hover:text-white transition-colors"
        >
           <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Scan Comparison</h1>
        <div className="w-10 h-10" />
      </div>

      {/* Summary Hero */}
      <div className={cn(
         "p-8 rounded-3xl border text-center space-y-4",
         improved ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
      )}>
         <h2 className="text-3xl font-bold tracking-tight">
            Scan B {improved ? 'improved' : 'regressed'} by {Math.abs((scoresB.overall || 0) - (scoresA.overall || 0))} points
         </h2>
         <p className="text-muted text-sm max-w-sm mx-auto">
            Comparing scan from {format(new Date(scanA.created_at), 'MMM d')} vs {format(new Date(scanB.created_at), 'MMM d')} for {scanA.projects?.name}
         </p>
      </div>

      {/* Date Header */}
      <div className="sticky top-0 z-40 grid grid-cols-2 gap-8 bg-background/80 py-4 backdrop-blur-xl">
         <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-[10px] font-black uppercase text-muted">Scan A (Older)</p>
            <p className="mt-1 text-xs font-bold text-primary">{format(new Date(scanA.created_at), 'MMM d, h:mm a')}</p>
         </div>
         <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-[10px] font-black uppercase text-muted">Scan B (Newer)</p>
            <p className="mt-1 text-xs font-bold text-primary">{format(new Date(scanB.created_at), 'MMM d, h:mm a')}</p>
         </div>
      </div>

      {/* Comparisons */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const delta = getDelta(cat.key)
          const sA = scoresA[cat.key] || 0
          const sB = scoresB[cat.key] || 0
          return (
            <div key={cat.key} className="rounded-2xl border border-white/5 bg-surface/80 p-6 backdrop-blur-sm">
               <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted">{cat.label}</h3>
                  <div className="text-sm">{delta.node}</div>
               </div>
               
               <div className="grid grid-cols-[1fr,80px,1fr] gap-4 items-center">
                  <div className="flex items-center gap-4 justify-end">
                     <p className="text-2xl font-bold tabular-nums">{sA}</p>
                     <div className="flex-1 max-w-[150px] h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/40" style={{ width: `${sA}%` }} />
                     </div>
                  </div>
                  
                  <div className="flex justify-center">
                     <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-muted">vs</div>
                  </div>

                  <div className="flex items-center gap-4">
                     <div className="flex-1 max-w-[150px] h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${sB}%` }} />
                     </div>
                     <p className="text-2xl font-bold tabular-nums">{sB}</p>
                  </div>
               </div>
            </div>
          )
        })}
      </div>

      {/* Issue Count Comparison */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden mt-12 shadow-2xl">
         <table className="w-full text-sm text-left">
            <thead className="bg-black/40 border-b border-border">
               <tr>
                  <th className="px-6 py-4 font-bold">Issue Comparison</th>
                  <th className="px-6 py-4 font-bold text-center">Scan A</th>
                  <th className="px-6 py-4 font-bold text-center">Scan B</th>
                  <th className="px-6 py-4 font-bold text-right">Change</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-border">
               {[
                  { id: 'total', label: 'Total Issues', countA: scanA.issue_count, countB: scanB.issue_count },
                  { id: 'pages', label: 'Pages Scanned', countA: scanA.page_count, countB: scanB.page_count },
               ].map((m) => {
                  const d = m.countB - m.countA
                  return (
                     <tr key={m.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-medium text-muted">{m.label}</td>
                        <td className="px-6 py-4 font-mono text-center">{m.countA}</td>
                        <td className="px-6 py-4 font-mono text-center">{m.countB}</td>
                        <td className={cn(
                           "px-6 py-4 font-mono text-right font-bold tabular-nums",
                           d > 0 ? "text-red-400" : d < 0 ? "text-green-400" : "text-muted"
                        )}>
                           {d > 0 ? `+${d}` : d}
                        </td>
                     </tr>
                  )
               })}
            </tbody>
         </table>
      </div>

      <div className="flex justify-center pt-8">
         <button 
           onClick={() => router.push(`/scans/${b}/report`)}
           className="flex items-center gap-3 rounded-2xl bg-primary px-10 py-4 font-bold text-primary-foreground shadow-glow transition-all hover:shadow-glow active:scale-[0.98]"
         >
            View Latest Report <ArrowRight className="w-5 h-5" />
         </button>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ComparePageContent />
    </Suspense>
  )
}
