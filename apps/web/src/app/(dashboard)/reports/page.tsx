'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { ScoreGauge } from '@/components/ScoreGauge'
import { format } from 'date-fns'
import Link from 'next/link'
import { FileText, Search, ExternalLink, Calendar, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'utils'

export default function ReportsPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')

  const { data: scans, isLoading } = useQuery({
    queryKey: ['all-scans'],
    queryFn: async () => {
       // We'll use the scans list but without a projectId to get all scans for user
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scans`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
       })
       const data = await res.json()
       return data.data as any[]
    },
    enabled: !!session?.access_token
  })

  const filtered = scans?.filter(s => 
    s.projects?.url?.toLowerCase().includes(search.toLowerCase()) ||
    s.projects?.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return (
     <div className="flex items-center justify-center h-[60vh] flex-col gap-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted text-sm">Loading reports...</p>
     </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Consolidated Reports</h1>
          <p className="text-muted text-sm mt-1">Access all your website audit reports in one place.</p>
        </div>
        <div className="relative max-w-sm w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
           <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by project or URL..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
           />
        </div>
      </div>

      {!scans || scans.length === 0 ? (
         <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
               <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">No reports yet</h2>
            <p className="text-muted max-w-sm mx-auto text-sm">Start a scan to generate your first professional website audit report.</p>
            <Link href="/projects" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
               Go to Projects
            </Link>
         </div>
      ) : (
         <div className="grid grid-cols-1 gap-4">
            {filtered?.map((scan) => (
               <Link 
                  key={scan.id} 
                  href={`/scans/${scan.id}/report`}
                  className="group bg-card border border-border hover:border-primary/30 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 transition-all hover:bg-primary/[0.02]"
               >
                  <div className="shrink-0">
                     <ScoreGauge score={Number(scan.overall_score) || 0} size={80} />
                  </div>
                  
                  <div className="flex-1 min-w-0 text-center md:text-left">
                     <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{scan.projects?.name}</h3>
                        <span className="hidden md:block text-muted">•</span>
                        <p className="text-xs text-muted font-mono truncate">{scan.projects?.url}</p>
                     </div>
                     <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           {scan.completed_at ? format(new Date(scan.completed_at), 'MMM d, h:mm a') : 'In Progress'}
                        </span>
                        <span className="px-2 py-0.5 bg-background border border-border rounded-lg">
                           {scan.issue_count || 0} Issues
                        </span>
                        <span className={cn(
                           "px-2 py-0.5 rounded-lg border font-bold uppercase text-[10px]",
                           scan.status === 'complete' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                           {scan.status}
                        </span>
                     </div>
                  </div>

                  <div className="shrink-0">
                     <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <ChevronRight className="w-5 h-5" />
                     </div>
                  </div>
               </Link>
            ))}
         </div>
      )}
    </div>
  )
}
