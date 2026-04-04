'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { ScoreGauge } from '@/components/ScoreGauge'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { 
  Search, 
  ExternalLink, 
  Filter, 
  X, 
  Calendar, 
  ChevronRight, 
  Clock, 
  FileText, 
  Settings2, 
  Zap, 
  AlertCircle,
  MoreVertical,
  Trash2,
  PlayCircle
} from 'lucide-react'
import { cn } from 'utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EmptyState, PageLoader } from '@/components/ui/Feedback'

const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-500/10 text-green-500 border-green-500/20',
  crawling: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  analyzing: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ai_processing: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  queued: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export default function ScanHistoryPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')

  const { data: scans, isLoading, refetch } = useQuery({
    queryKey: ['all-scans'],
    queryFn: async () => {
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scans`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
       })
       const data = await res.json()
       return data.data as any[]
    },
    enabled: !!session?.access_token
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.projects.list(session?.access_token || ''),
    enabled: !!session?.access_token
  })

  const filtered = useMemo(() => {
    return scans?.filter(s => {
      const matchSearch = (s.projects?.url || '').toLowerCase().includes(search.toLowerCase()) || 
                          (s.projects?.name || '').toLowerCase().includes(search.toLowerCase())
      const matchProject = projectFilter === 'all' || s.project_id === projectFilter
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      
      let matchScore = true
      if (scoreFilter === 'critical') matchScore = (s.overall_score || 0) < 40
      if (scoreFilter === 'needs_work') matchScore = (s.overall_score || 0) >= 40 && (s.overall_score || 0) < 70
      if (scoreFilter === 'good') matchScore = (s.overall_score || 0) >= 70

      return matchSearch && matchProject && matchStatus && matchScore
    })
  }, [scans, search, projectFilter, statusFilter, scoreFilter])


  const handleDelete = async (id: string) => {
     try {
        await apiClient.scans.delete(id, session?.access_token || '')
        toast.success('Scan deleted')
        refetch()
     } catch (err: any) {
        toast.error(err.message)
     }
  }

  const getIssueBadge = (scan: any) => {
     const count = scan.issue_count || 0
     if (count === 0 && scan.status === 'complete') return 'bg-green-500/20 text-green-400'
     if (count > 50) return 'bg-red-500/20 text-red-400'
     if (count > 20) return 'bg-orange-500/20 text-orange-400'
     return 'bg-yellow-500/20 text-yellow-400'
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Scan History</h1>
          <p className="text-muted text-sm mt-1">Monitor and compare audit results over time.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/projects" 
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-xl shadow-primary/20"
          >
            <PlayCircle className="w-4 h-4" /> New Audit
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
           <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by URL..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
           />
        </div>

        <select 
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none cursor-pointer"
        >
          <option value="all">All Projects</option>
          {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none cursor-pointer"
        >
          <option value="all">Any Status</option>
          <option value="complete">Complete</option>
          <option value="crawling">In Progress</option>
          <option value="failed">Failed</option>
        </select>

        <select 
          value={scoreFilter}
          onChange={e => setScoreFilter(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none cursor-pointer"
        >
          <option value="all">Any Score</option>
          <option value="good">Good ({'>'}70)</option>
          <option value="needs_work">Needs Work (40-70)</option>
          <option value="critical">Critical ({'<'}40)</option>
        </select>

        {(search || projectFilter !== 'all' || statusFilter !== 'all' || scoreFilter !== 'all') && (
           <button 
              onClick={() => { setSearch(''); setProjectFilter('all'); setStatusFilter('all'); setScoreFilter('all') }}
              className="text-[#64748b] hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
           >
              <X className="w-4 h-4" /> Clear
           </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#0d0d14] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        {!filtered || filtered.length === 0 ? (
           <EmptyState 
              icon={FileText} 
              title="No scans found" 
              description="Adjust your filters or start a new audit to see results."
              action={{ label: 'Start First Scan', onClick: () => router.push('/projects') }}
           />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/40 border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#64748b]">Project</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#64748b]">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#64748b]">Score</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#64748b]">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="group hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => router.push(`/scans/${s.id}/report`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${s.projects?.url}&sz=32`} 
                          className="w-8 h-8 rounded-lg bg-black/20 p-1"
                          alt="" 
                          onError={e => e.currentTarget.style.display = 'none'}
                        />
                        <div className="min-w-0">
                          <p className="font-bold truncate text-sm">{s.projects?.name}</p>
                          <p className="text-[10px] text-[#64748b] truncate font-mono">{s.projects?.url}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest flex items-center gap-1.5 w-fit",
                          STATUS_COLORS[s.status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                       )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", s.status === 'complete' ? 'bg-green-500' : 'bg-indigo-500 animate-pulse')} />
                          {s.status.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       {s.status === 'complete' ? (
                          <ScoreGauge score={s.overall_score || 0} size={50} strokeWidth={4} />
                       ) : (
                          <span className="text-[#64748b] font-mono text-sm">--</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-xs space-y-0.5">
                          <p className="text-white font-medium">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</p>
                          <p className="text-[10px] text-[#64748b]">{format(new Date(s.created_at), 'MMM d, yyyy')}</p>
                       </div>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                       <div className="flex items-center justify-end gap-2">
                          <button 
                             onClick={() => handleDelete(s.id)}
                             className="p-2 text-[#64748b] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
