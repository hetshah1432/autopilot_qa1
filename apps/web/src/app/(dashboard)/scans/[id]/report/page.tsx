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
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-16 pb-48">
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
      <nav className="flex items-center justify-center gap-6 p-2 bg-surface-lighter/50 backdrop-blur-3xl border border-white/5 rounded-3xl w-fit mx-auto sticky top-24 z-50 shadow-2xl print:hidden">
        {['overview', 'scores', 'issues', 'pages'].map(s => (
          <a key={s} href={`#${s}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-white px-6 py-3 hover:bg-white/5 rounded-2xl transition-all">
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
               <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
                     <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt="" className="w-12 h-12 rounded-xl" />
                  </div>
                  <div>
                     <h2 className="text-4xl font-black tracking-tighter text-white">{domain}</h2>
                     <Link href={siteUrl} target="_blank" className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5 mt-1 tracking-wider uppercase">
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
            <div className="flex items-center gap-4 mt-12 print:hidden">
               <button onClick={() => window.print()} className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Generate PDF Report
               </button>
            </div>
         </div>
         
         <div className="lg:col-span-2 bg-[#8b7cff]/5 border border-[#8b7cff]/20 rounded-[48px] p-12 flex flex-col items-center justify-center text-center shadow-2xl shadow-primary/5 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative transform scale-150 mb-10">
               <ScoreGauge score={scores.overall ?? 0} size={140} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-12">Overall Core Score</p>
         </div>
      </section>

      <CrawlLimitationsBanner scan={scan} onFallbackSuccess={() => refetch()} />

      {/* 📊 Section 2: Vital Metrics (Bento Staggered) */}
      <section id="scores" className="space-y-12">
        <div className="flex items-center justify-between print:break-before-page">
           <h2 className="text-3xl font-black uppercase tracking-tighter">Bento Metric Insights</h2>
           <div className="h-px flex-1 bg-white/10 ml-8" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Highlight Card 1: Performance */}
          <div className="lg:col-span-2 bg-surface-lighter border border-white/5 rounded-[48px] p-10 flex items-center gap-10 hover:border-white/15 transition-all shadow-2xl">
              <div className="scale-110"><ScoreGauge score={scores.performance} size={120} label="Performance" /></div>
              <div className="space-y-3">
                 <div className="flex items-center gap-2 text-primary">
                    <Zap className="w-5 h-5 fill-current" />
                    <span className="text-xs font-black uppercase tracking-widest">Network Impact</span>
                 </div>
                 <p className="text-xs text-muted leading-relaxed max-w-xs">Analysis of load times, asset compression, and visual stability metrics.</p>
              </div>
          </div>

          {/* Highlight Card 2: Accessibility */}
          <div className="lg:col-span-2 bg-surface-lighter border border-white/5 rounded-[48px] p-10 flex items-center gap-10 hover:border-white/15 transition-all shadow-2xl">
              <div className="scale-110"><ScoreGauge score={scores.accessibility} size={120} label="Inclusion" /></div>
              <div className="space-y-3">
                 <div className="flex items-center gap-2 text-indigo-400">
                    <Accessibility className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Interface Inclusion</span>
                 </div>
                 <p className="text-xs text-muted leading-relaxed max-w-xs">Evaluating screen reader support, keyboard nav, and color contrast compliance.</p>
              </div>
          </div>

          {/* Compact Cards */}
          {['seo', 'security', 'ux', 'broken_links'].map(key => {
            const Icon = CAT_ICONS[key]
            const s = scores[key]
            return (
              <div key={key} className="bg-surface-lighter border border-white/5 rounded-[40px] p-8 text-center transition-all hover:bg-white/[0.02] shadow-xl">
                <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-muted mx-auto mb-6 border border-white/5">
                   <Icon className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-black uppercase text-muted mb-6 tracking-widest">{CAT_LABELS[key]}</p>
                <div className="scale-75"><ScoreGauge score={s} size={100} /></div>
              </div>
            )
          })}
        </div>
      </section>

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
                <div className="flex-1 p-8">
                  <div className="flex items-center justify-between gap-8">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleIssue(issue.id)}>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                         <span className={cn('px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest border', SEV_TEXT[issue.severity])}>{issue.severity}</span>
                         <span className="px-3 py-1 text-[9px] font-black rounded-lg bg-surface border border-white/10 text-muted uppercase tracking-widest">{CAT_LABELS[issue.category] || issue.category}</span>
                         {issue.scope === 'sitewide' && <span className="px-3 py-1 text-[9px] font-black rounded-lg bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest">Sitewide Impact</span>}
                      </div>
                      <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors tracking-tight print:text-black">{issue.title}</h4>
                    </div>
                    <button onClick={() => toggleIssue(issue.id)} className={cn("p-3 rounded-2xl bg-white/5 border border-white/5 transition-all print:hidden", expandedIssues.has(issue.id) ? "rotate-180 bg-primary/10 text-primary" : "text-muted hover:text-white")}>
                       <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Expanded Detail (Visible in print by default via CSS global style) */}
                  <AnimatePresence>
                     {(expandedIssues.has(issue.id) || typeof window === 'undefined') && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden print:!h-auto print:!opacity-100 print:!block">
                          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-10 print:border-slate-100 print:gap-12">
                             <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.4em] opacity-80">Analysis Conclusion</span>
                                <p className="text-sm text-secondary-foreground leading-relaxed print:text-slate-600">{issue.ai_explanation || issue.description}</p>
                             </div>
                             {issue.ai_how_to_fix && (
                                <div className="p-8 bg-primary/5 border border-primary/10 rounded-3xl space-y-4 print:bg-slate-50 print:border-slate-200">
                                   <div className="flex items-center gap-2">
                                      <MousePointer2 className="w-4 h-4 text-primary" />
                                      <span className="text-[10px] font-black uppercase text-primary tracking-[0.4em]">Actionable Remedy</span>
                                   </div>
                                   <p className="text-xs font-medium text-muted-foreground whitespace-pre-wrap leading-relaxed print:text-slate-500">{issue.ai_how_to_fix}</p>
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
        
        <div className="bg-surface-lighter border border-white/5 rounded-[48px] overflow-hidden shadow-2xl print:border-slate-200 print:rounded-none">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-[#0c0c14] border-b border-white/5 print:bg-slate-50 print:border-slate-200">
              <tr className="text-muted font-black uppercase tracking-[0.3em]">
                <th className="px-12 py-8">Path Identity</th>
                <th className="px-12 py-8 text-center">Status</th>
                <th className="px-12 py-8 text-right">Latency (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-slate-100">
              {pages.slice(0, 100).map(p => (
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
      </section>

      <AnimatePresence>
        {fixModal && <FixCodeModal issueId={fixModal.id} issueTitle={fixModal.title} onClose={() => setFixModal(null)} />}
      </AnimatePresence>

      <div id="ai-chat" className="print:hidden">
        <ScanChatAssistant scanId={params.id} siteUrl={siteUrl} />
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 1.5cm; size: a4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body, html { background: white !important; color: black !important; font-family: 'Inter', sans-serif !important; overflow: visible !important; }
          
          /* Hide Web UI Elements */
          nav, #ai-chat, button, .CrawlLimitationsBanner, .print\:hidden, .DownloadIcon { display: none !important; }
          
          /* Main Layout Scaling */
          .max-w-\[1400px\] { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          section { border: none !important; background: white !important; color: black !important; margin-bottom: 2cm !important; padding: 0 !important; width: 100% !important; display: block !important; }
          
          /* Header & Typography */
          h1, h2, h3, h4 { color: #000 !important; font-weight: 900 !important; letter-spacing: -0.05em !important; }
          p, span, td, th { color: #444 !important; }
          
          /* Specific Sections */
          .print\:flex { display: flex !important; }
          .print\:!h-auto { height: auto !important; }
          .print\:!opacity-100 { opacity: 1 !important; }
          .print\:!block { display: block !important; }
          
          /* Bento Adjustments */
          .grid { display: block !important; }
          .lg\:col-span-3, .lg\:col-span-2, .lg\:col-span-5, .lg\:col-span-4 { width: 100% !important; margin-bottom: 1cm !important; }
          .bg-surface-lighter { border: 1px solid #efefef !important; background: #fff !important; box-shadow: none !important; }
          
          /* Findings */
          .print\:break-inside-avoid { break-inside: avoid !important; }
          .print\:break-before-page { break-before: page !important; padding-top: 1cm !important; }
          .print\:bg-slate-50 { background: #f8fafc !important; }
          .print\:border-slate-200 { border: 1px solid #e2e8f0 !important; }
          
          /* Table Wrapping */
          .print\:whitespace-normal { white-space: normal !important; }
          .print\:break-all { word-break: break-all !important; }
        }
      `}</style>
    </div>
  )
}
