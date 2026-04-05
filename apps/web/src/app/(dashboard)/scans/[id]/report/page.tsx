'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import { cn } from 'utils'
import Link from 'next/link'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarArea } from 'recharts'
import dynamic from 'next/dynamic'

import {
  Search,
  Accessibility,
  Zap,
  Shield,
  Palette,
  Link as LinkIcon,
  Download,
  ExternalLink,
  ChevronDown,
  Layout,
  FileText,
  MousePointer2,
  AlertTriangle
} from 'lucide-react'

const FixCodeModal = dynamic(() => import('@/components/report/FixCodeModal'), { ssr: false })
const ScanChatAssistant = dynamic(() => import('@/components/chat/ScanChatAssistant'), { ssr: false })

// ─── Constants ──────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500',
  low: 'bg-blue-500', info: 'bg-gray-500',
}
const SEV_TEXT: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  info: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
}

const CAT_ICONS: Record<string, any> = {
  seo: Search,
  accessibility: Accessibility,
  performance: Zap,
  security: Shield,
  ux: Palette,
  broken_links: LinkIcon,
}

const CAT_LABELS: Record<string, string> = {
  seo: 'SEO',
  accessibility: 'Accessibility',
  performance: 'Performance',
  security: 'Security',
  ux: 'UX Design',
  broken_links: 'Integrity',
}

// ─── Components ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 120, label }: { score: number | null; size?: number; label?: string }) {
  if (score === null || score === undefined) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center bg-surface-lighter rounded-full border border-border">
        <span className="text-xl font-bold text-muted">--</span>
      </div>
    )
  }
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-white/[0.03]" />
          <motion.circle 
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black tracking-tighter" style={{ color }}>{score}</span>
        </div>
      </div>
      {label && <span className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</span>}
    </div>
  )
}

function ManualPageInput({ p, onRemove, onUpdate, idx, canRemove }: any) {
  return (
    <div className="p-6 bg-surface-lighter border border-border rounded-3xl relative space-y-4">
       {canRemove && (
         <button onClick={onRemove} className="absolute top-6 right-6 text-muted hover:text-red-400 p-1 z-10 transition-colors">
           <Layout className="w-4 h-4 rotate-45" />
         </button>
       )}
       <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-muted ml-1 tracking-widest">Page URL {idx + 1}</label>
             <input value={p.url} onChange={e => onUpdate('url', e.target.value)} placeholder="https://example.com/login" className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-muted ml-1 tracking-widest">Raw HTML Source</label>
             <textarea value={p.html} onChange={e => onUpdate('html', e.target.value)} placeholder="Copy and paste HTML source here..." className="w-full h-32 bg-surface border border-border rounded-2xl px-5 py-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" />
          </div>
       </div>
    </div>
  )
}

function CrawlLimitationsBanner({ scan, onFallbackSuccess }: any) {
  const [manualPages, setManualPages] = useState<any[]>([{ id: '1', url: '', html: '' }])
  const [loading, setLoading] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const { session } = useAuth()

  const isLimited = scan.report_mode && ['partial', 'protected_site_limited', 'owner_assisted'].includes(scan.report_mode);
  const isFinished = ['complete', 'completed_with_errors'].includes(scan.status);

  if (!isLimited || !isFinished) return null;

  const handleAnalyzeAll = async () => {
    const validPages = manualPages.filter(p => p.url && p.html)
    if (validPages.length === 0) return
    setLoading(true)
    try {
      for (const p of validPages) {
        await apiClient.scans.submitFallback(scan.id, { html: p.html, url: p.url }, session?.access_token || '')
      }
      onFallbackSuccess()
      setShowFallback(false)
    } catch (e: any) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-[40px] p-10 mb-12 shadow-2xl shadow-warning/5">
       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-lg">Incomplete Audit Coverage</h3>
             </div>
             <p className="text-sm text-muted max-w-xl">Our scanners were restricted by your server's security policy. You can provide the HTML manually to complete the diagnostic.</p>
          </div>
          <button onClick={() => setShowFallback(!showFallback)} className="px-8 py-4 bg-warning text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-warning/20 shrink-0">
            {showFallback ? 'Close Panel' : 'Submit Manual Source'}
          </button>
       </div>
       <AnimatePresence>
          {showFallback && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-10 space-y-6">
               {manualPages.map((p, idx) => (
                 <ManualPageInput key={p.id} p={p} idx={idx} canRemove={manualPages.length > 1} onRemove={() => setManualPages(prev => prev.filter(x => x.id !== p.id))} onUpdate={(f: any, v: any) => setManualPages(prev => prev.map(x => x.id === p.id ? { ...x, [f]: v } : x))} />
               ))}
               <button onClick={() => setManualPages([...manualPages, { id: Math.random().toString(), url: '', html: '' }])} className="w-full py-4 border-2 border-dashed border-border rounded-3xl text-sm font-bold text-muted hover:text-warning hover:border-warning/30 transition-all">+ Add Another Page</button>
               <button disabled={loading} onClick={handleAnalyzeAll} className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]">{loading ? 'Processing...' : 'Run Targeted Analysis'}</button>
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ReportPage({ params }: { params: { id: string } }) {
  const { session } = useAuth()
  const [catFilter, setCatFilter] = useState('all')
  const [sevFilter, setSevFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  const [fixModal, setFixModal] = useState<{ id: string; title: string } | null>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const { data: scan, isLoading, error, refetch } = useQuery({
    queryKey: ['scan', params.id],
    queryFn: () => apiClient.scans.get(params.id, session?.access_token || ''),
    enabled: !!session?.access_token,
    refetchInterval: (data: any) => (data?.status === 'complete' ? false : 5000),
  })

  if (isLoading) return <div className="flex items-center justify-center h-[80vh] flex-col gap-6 animate-pulse"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-sm" /><p className="text-muted font-bold tracking-widest uppercase text-[10px]">Assembling Intelligence Report...</p></div>
  if (error || !scan) return <div className="flex items-center justify-center h-[80vh] text-error font-bold">Report sync failed</div>

  const scores = Array.isArray(scan.scan_scores) ? scan.scan_scores[0] : scan.scan_scores || {}
  const issues: any[] = scan.issues || []
  const pages: any[] = scan.pages || []
  const siteUrl = (scan.projects as any)?.url || ''
  const domain = (() => { try { return new URL(siteUrl).hostname } catch { return siteUrl } })()

  const filteredIssues = issues.filter(i => 
    (catFilter === 'all' || i.category === catFilter) &&
    (sevFilter === 'all' || i.severity === sevFilter) &&
    (!search || i.title.toLowerCase().includes(search.toLowerCase()))
  )
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const o: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
    return (o[a.severity] ?? 5) - (o[b.severity] ?? 5)
  })
  const paginatedIssues = sortedIssues.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(sortedIssues.length / PER_PAGE)

  const radarData = [
    { category: 'SEO', value: scores.seo ?? 0 },
    { category: 'A11y', value: scores.accessibility ?? 0 },
    { category: 'Perf', value: scores.performance ?? 0 },
    { category: 'Sec', value: scores.security ?? 0 },
    { category: 'UX', value: scores.ux ?? 0 },
    { category: 'Link', value: scores.broken_links ?? 0 },
  ]

  const toggleIssue = (id: string) => setExpandedIssues(prev => { 
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n 
  })

  return (
    <div className="max-w-[1400px] mx-auto py-6 sm:py-12 px-4 sm:px-8 space-y-10 sm:space-y-16 pb-48">
      {/* 🧾 [PFD ONLY] - Consultant Cover Page */}
      <div className="hidden print:flex flex-col items-center justify-center h-[26cm] text-center border-b-8 border-primary mb-20">
         <div className="mb-12">
            <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center shadow-glow mb-6 mx-auto">
               <Zap className="w-12 h-12 text-white fill-white" />
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-black uppercase">Technical Audit</h1>
            <p className="text-xl font-bold text-muted-foreground tracking-[0.4em] mt-4 uppercase">Internal Intelligence Report</p>
         </div>
         <div className="bg-slate-50 border border-slate-200 rounded-[40px] p-12 w-full max-w-2xl shadow-sm text-left space-y-8">
            <div className="grid grid-cols-2 gap-8 text-sm uppercase tracking-widest font-black text-slate-400">
               <div className="space-y-1">
                  <span className="block opacity-50">Target Domain</span>
                  <span className="block text-black text-lg truncate tracking-tight">{domain}</span>
               </div>
               <div className="space-y-1">
                  <span className="block opacity-50">Audit Date</span>
                  <span className="block text-black text-lg tracking-tight">{new Date(scan.created_at).toLocaleDateString()}</span>
               </div>
               <div className="space-y-1">
                  <span className="block opacity-50">Confidentiality</span>
                  <span className="block text-black text-lg tracking-tight text-primary">Restricted Audit</span>
               </div>
               <div className="space-y-1">
                  <span className="block opacity-50">Overall Score</span>
                  <span className="block text-black text-lg tracking-tight">{scores.overall}% / 100%</span>
               </div>
            </div>
         </div>
         <p className="mt-auto text-slate-300 font-bold uppercase tracking-widest text-[10px]">Autopilot QA | AI-Powered Web Intelligence</p>
      </div>

      {/* 🧭 Global Persistent Controls */}
      <nav className="flex items-center justify-center gap-1 sm:gap-6 p-1 sm:p-2 bg-surface-lighter/50 backdrop-blur-3xl border border-white/5 rounded-2xl sm:rounded-3xl w-fit mx-auto sticky top-20 z-30 shadow-2xl print:hidden overflow-x-auto no-scrollbar">
        {['overview', 'scores', 'issues', 'pages'].map(s => (
          <a key={s} href={`#${s}`} className="text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted hover:text-white px-3 sm:px-6 py-2 sm:py-3 hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all whitespace-nowrap">
            {s}
          </a>
        ))}
      </nav>

      {/* 🏆 Section 1: Hero Dashboard (Bento Hero) */}
      <section id="overview" className="grid grid-cols-1 lg:grid-cols-5 gap-8 print:hidden">
         <div className="lg:col-span-3 bg-surface-lighter border border-white/5 rounded-[48px] p-12 flex flex-col justify-between relative overflow-hidden shadow-2xl group transition-all hover:border-white/10">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
               <Layout className="w-64 h-64 rotate-12" />
            </div>
            <div className="relative">
               <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 sm:mb-10">
                  <div className="p-3 sm:p-4 bg-white/5 rounded-3xl border border-white/10">
                     <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
                  </div>
                  <div className="text-center sm:text-left">
                     <h2 className="text-2xl sm:text-4xl font-black tracking-tighter text-white break-all">{domain}</h2>
                     <Link href={siteUrl} target="_blank" className="text-[10px] sm:text-xs text-primary font-bold hover:underline flex items-center justify-center sm:justify-start gap-1.5 mt-1 tracking-wider uppercase">
                        {siteUrl}
                        <ExternalLink className="w-3 h-3" />
                     </Link>
                  </div>
               </div>
               <div className="space-y-4 max-w-lg">
                  <h3 className="text-xl font-bold">Executive Summary</h3>
                  <p className="text-muted leading-relaxed text-sm">
                     Comprehensive audit revealed an infrastructure score of <span className="text-white font-black">{scores.overall}%</span>. 
                     The diagnostic prioritized <span className="text-white font-black">{sortedIssues.length}</span> active findings across 
                     <span className="text-white font-black"> {pages.length}</span> captured pages.
                  </p>
               </div>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-8 sm:mt-12 print:hidden">
               <button onClick={() => window.print()} className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Generate PDF Report
               </button>
            </div>
         </div>
         
         <div className="lg:col-span-2 bg-[#8b7cff]/5 border border-[#8b7cff]/20 rounded-[48px] p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-2xl shadow-primary/5 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative transform scale-150 mb-10">
               <ScoreGauge score={scores.overall ?? 0} size={140} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-12">Overall Core Score</p>
         </div>
      </section>

      <CrawlLimitationsBanner scan={scan} onFallbackSuccess={() => refetch()} />


      {/* 🔎 Section 3: Diagnostic Findings (High-Contrast Ledger) */}
      <section id="issues" className="space-y-12">
        <div className="flex items-center justify-between print:break-before-page">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Root Cause Diagnostics</h2>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-2">
             <FileText className="w-4 h-4 text-primary" />
             <span className="text-[10px] font-black uppercase text-primary tracking-widest">{sortedIssues.length} ACTIVE FINDINGS</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 print:hidden">
          <div className="flex-1 min-w-[300px] relative group">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
             <input value={search} onChange={e => {setSearch(e.target.value); setPage(1)}} placeholder="Search technical findings..." className="w-full bg-surface-lighter border border-white/5 rounded-3xl pl-14 pr-6 py-4 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" />
          </div>
          <select value={catFilter} onChange={e => {setCatFilter(e.target.value); setPage(1)}} className="bg-surface-lighter border border-white/5 rounded-3xl px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted outline-none hover:bg-white/5 transition-colors focus:ring-4 focus:ring-primary/10 cursor-pointer">
            <option value="all">Any Category</option>
            {Object.keys(CAT_ICONS).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
          <select value={sevFilter} onChange={e => {setSevFilter(e.target.value); setPage(1)}} className="bg-surface-lighter border border-white/5 rounded-3xl px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted outline-none hover:bg-white/5 transition-colors focus:ring-4 focus:ring-primary/10 cursor-pointer">
            <option value="all">Any Severity</option>
            {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>

        <div className="space-y-6">
          {paginatedIssues.map(issue => (
            <div key={issue.id} className="bg-surface-lighter/50 border border-white/5 rounded-[40px] overflow-hidden group hover:border-primary/25 transition-all shadow-xl print:border-slate-200 print:bg-white print:shadow-none print:break-inside-avoid">
              <div className="flex items-stretch gap-0">
                <div className={cn('w-2 shrink-0 my-8 ml-8 rounded-full', SEV_COLOR[issue.severity])} />
                <div className="flex-1 p-5 sm:p-8">
                  <div className="flex items-center justify-between gap-4 sm:gap-8">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleIssue(issue.id)}>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                         <span className={cn('px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-black rounded-lg uppercase tracking-widest border', SEV_TEXT[issue.severity])}>{issue.severity}</span>
                         <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-black rounded-lg bg-surface border border-white/10 text-muted uppercase tracking-widest">{CAT_LABELS[issue.category] || issue.category}</span>
                         {issue.scope === 'sitewide' && <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-black rounded-lg bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest italic">Global</span>}
                      </div>
                      <h4 className="font-bold text-sm sm:text-lg text-white group-hover:text-primary transition-colors tracking-tight print:text-black leading-tight">{issue.title}</h4>
                    </div>
                    <button onClick={() => toggleIssue(issue.id)} className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 transition-all print:hidden", expandedIssues.has(issue.id) ? "rotate-180 bg-primary/10 text-primary" : "text-muted hover:text-white")}>
                       <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  
                  {/* Expanded Detail (Visible in print by default via CSS global style) */}
                  <AnimatePresence>
                     {(expandedIssues.has(issue.id) || typeof window === 'undefined') && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden print:!h-auto print:!opacity-100 print:!block">
                          <div className="mt-5 sm:mt-8 pt-5 sm:pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 print:border-slate-100 print:gap-12">
                             <div className="space-y-2 sm:space-y-4">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-[0.2em] sm:tracking-[0.4em] opacity-80">Analysis Conclusion</span>
                                <p className="text-xs sm:text-sm text-secondary-foreground leading-relaxed print:text-slate-600">{issue.ai_explanation || issue.description}</p>
                             </div>
                             {issue.ai_how_to_fix && (
                                <div className="p-5 sm:p-8 bg-primary/5 border border-primary/10 rounded-2xl sm:rounded-3xl space-y-2 sm:space-y-4 print:bg-slate-50 print:border-slate-200">
                                   <div className="flex items-center gap-2">
                                      <MousePointer2 className="w-4 h-4 text-primary" />
                                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-[0.2em] sm:tracking-[0.4em]">Actionable Remedy</span>
                                   </div>
                                   <p className="text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-pre-wrap leading-relaxed print:text-slate-500">{issue.ai_how_to_fix}</p>
                                </div>
                             )}
                          </div>
                       </motion.div>
                     )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📋 Section 4: Inventory Analysis (Wrapped Table) */}
      <section id="pages" className="space-y-12">
        <div className="flex items-center justify-between print:break-before-page">
           <h2 className="text-3xl font-black uppercase tracking-tighter">Surface Inventory</h2>
           <div className="h-px flex-1 bg-white/10 ml-8" />
        </div>
        
        <div className="bg-surface-lighter border border-white/5 rounded-3xl sm:rounded-[48px] overflow-hidden shadow-2xl print:border-slate-200 print:rounded-none">
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-[#0c0c14] border-b border-white/5 print:bg-slate-50 print:border-slate-200">
                <tr className="text-muted font-black uppercase tracking-[0.3em]">
                  <th className="px-12 py-8">Path Identity</th>
                  <th className="px-12 py-8 text-center">Status</th>
                  <th className="px-12 py-8 text-right">Latency (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-slate-100">
                {pages.slice(0, 50).map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group print:text-black">
                    <td className="px-12 py-6">
                       <span className="font-bold text-muted group-hover:text-white transition-colors print:text-slate-700 print:whitespace-normal print:break-all">{p.url}</span>
                    </td>
                    <td className="px-12 py-6 text-center">
                      <span className={cn('px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest', p.status_code < 400 ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20')}>
                         {p.status_code || '---'}
                      </span>
                    </td>
                    <td className="px-12 py-6 text-right font-black text-muted tabular-nums tabular-nums print:text-slate-500">{p.response_time_ms || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden divide-y divide-white/5">
            {pages.slice(0, 30).map(p => (
              <div key={p.id} className="p-5 space-y-3">
                 <div className="font-bold text-xs text-muted truncate">{p.url}</div>
                 <div className="flex items-center justify-between">
                    <span className={cn('px-3 py-1 rounded-lg border text-[8px] font-black tracking-widest', p.status_code < 400 ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20')}>
                       HTTP {p.status_code || '---'}
                    </span>
                    <span className="text-[10px] font-black text-muted tabular-nums">{p.response_time_ms || 0}ms</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {fixModal && <FixCodeModal issueId={fixModal.id} issueTitle={fixModal.title} onClose={() => setFixModal(null)} />}
      </AnimatePresence>

      <div id="ai-chat" className="print:hidden">
        <ScanChatAssistant scanId={params.id} siteUrl={siteUrl} />
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 1cm; size: a4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji" !important; }
          body, html { background: white !important; color: black !important; font-size: 11pt !important; line-height: 1.5 !important; }
          
          /* Hide Elements */
          nav, #ai-chat, button, .CrawlLimitationsBanner, .overflow-x-auto.no-scrollbar, .DownloadIcon { display: none !important; }
          
          /* Layout */
          .max-w-\[1400px\] { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          section { border: none !important; background: transparent !important; margin-bottom: 2cm !important; padding: 0 !important; page-break-inside: avoid; }
          
          /* Header Typography */
          h1, h2, h3, h4 { color: #111 !important; font-weight: 700 !important; letter-spacing: -0.02em !important; page-break-after: avoid; }
          h1 { font-size: 32pt !important; }
          h2 { font-size: 18pt !important; border-bottom: 2px solid #eee; padding-bottom: 8pt; margin-top: 1.5cm !important; }
          h4 { font-size: 14pt !important; }
          
          /* Bento/Card Normalization */
          .bg-surface-lighter { border: 1pt solid #e5e7eb !important; background: #fafafa !important; border-radius: 12pt !important; padding: 1.5rem !important; }
          
          /* Grid normalization */
          .grid { display: block !important; }
          .lg\:col-span-3, .lg\:col-span-2 { width: 100% !important; margin-bottom: 1.5cm !important; }
          
          /* Finding Cards */
          .print\:break-inside-avoid { break-inside: avoid !important; margin-bottom: 24pt !important; }
          .print\:bg-slate-50 { background: #f9fafb !important; }
          .print\:border-slate-200 { border: 1pt solid #e5e7eb !important; }
          
          /* Findings text consistency */
          .text-secondary-foreground, .text-muted-foreground { color: #374151 !important; font-size: 10pt !important; }
          
          /* Table improvements */
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #eee !important; font-size: 9pt !important; }
          th { background-color: #f3f4f6 !important; color: #111 !important; font-weight: 800 !important; padding: 12pt !important; border: 1px solid #eee !important; }
          td { padding: 12pt !important; border-bottom: 1px solid #eee !important; color: #4b5563 !important; }
          .print\:whitespace-normal { white-space: normal !important; word-break: break-all !important; }
          
          /* Color status indicators */
          .bg-success\/10 { background-color: #ecfdf5 !important; border: 1px solid #10b981 !important; color: #065f46 !important; }
          .bg-error\/10 { background-color: #fef2f2 !important; border: 1px solid #ef4444 !important; color: #991b1b !important; }
          .bg-red-500 { background-color: #ef4444 !important; }
          .bg-orange-500 { background-color: #f97316 !important; }
        }
      `}</style>
    </div>
  )
}
