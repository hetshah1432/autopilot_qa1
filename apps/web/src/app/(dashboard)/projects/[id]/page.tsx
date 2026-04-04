import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ScoreGauge } from "@/components/ScoreGauge"
import { TrendingUp, Globe, Settings as SettingsIcon, Activity, Clock, AlertCircle, Calendar, ExternalLink, Zap } from "lucide-react"
import Link from "next/link"
import { ProjectCharts } from "@/components/ProjectCharts"
import { DashboardCharts } from "@/components/DashboardCharts"
import { DeleteProjectButton } from "@/components/DeleteProjectButton"
import { ScanButton } from "@/components/ScanButton"
import { ScanSummary } from "@/components/ScanSummary"
import { LiveScanStatus } from "@/components/LiveScanStatus"
import { cn } from "utils"

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params, searchParams }: { params: { id: string }, searchParams: { tab?: string, timeframe?: string } }) {
  const supabase = createClient()
  const [{ data: { user } }, { data: project, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('projects')
      .select(`
        *,
        scans (
          *,
          scan_scores (*)
        )
      `)
      .order('created_at', { foreignTable: 'scans', ascending: false })
      .eq('id', params.id)
      .single()
  ])

  if (!user || error || !project || project.user_id !== user.id) return notFound()

  const currentTab = searchParams.tab || 'overview'
  const timeframe = searchParams.timeframe || 'ALL'
  
  const latestScan = project.scans?.[0]
  const healthScore = latestScan?.status === 'complete' ? (latestScan?.overall_score ?? null) : null
  const scanStatus = latestScan?.status || 'never_scanned'
  const rawScores = latestScan?.scan_scores
  const scanScores = Array.isArray(rawScores) ? rawScores[0] : rawScores || {}

  // Filter scans for trend chart
  const now = new Date()
  const filteredScans = (project.scans || []).filter((s: any) => {
    if (timeframe === 'ALL') return true
    const scanDate = new Date(s.created_at)
    const diffDays = (now.getTime() - scanDate.getTime()) / (1000 * 3600 * 24)
    if (timeframe === '1W') return diffDays <= 7
    if (timeframe === '1M') return diffDays <= 30
    if (timeframe === '1Y') return diffDays <= 365
    return true
  })

  // Format trend data
  const trendData = [...filteredScans].reverse().map(s => ({
    name: new Date(s.created_at).toLocaleDateString(),
    uniqueName: `${new Date(s.created_at).toLocaleDateString()} - ${s.id.slice(0, 4)}`,
    score: s.overall_score || 0
  }))

  const radarData = scanScores ? [
    { subject: 'SEO', A: scanScores.seo || 0, fullMark: 100 },
    { subject: 'Accessibility', A: scanScores.accessibility || 0, fullMark: 100 },
    { subject: 'Performance', A: scanScores.performance || 0, fullMark: 100 },
    { subject: 'Security', A: scanScores.security || 0, fullMark: 100 },
    { subject: 'UX', A: scanScores.ux || 0, fullMark: 100 },
    { subject: 'Links', A: scanScores.broken_links || 0, fullMark: 100 },
  ] : []

  return (
    <div className="space-y-10">
      {/* Project Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-surface p-8 md:p-10 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />
         
         <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
            <ScoreGauge score={healthScore} size={140} strokeWidth={10} />
            <div className="text-center md:text-left">
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                  <div className="flex flex-wrap items-center gap-3">
                     <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                        Project ID: {project.id.slice(0, 8).toUpperCase()}
                     </span>
                     <div className="flex items-center gap-2">
                        <span className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                           scanStatus === 'complete' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                           scanStatus === 'failed' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                           scanStatus === 'never_scanned' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                           "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse"
                        )}>
                           Status: {scanStatus.replace('_', ' ').toUpperCase()}
                        </span>
                     </div>
                  </div>
               </div>
               
               {['queued', 'crawling', 'analyzing', 'ai_processing', 'ai_progress'].includes(scanStatus) && latestScan && (
                  <LiveScanStatus scanId={latestScan.id} initialStatus={scanStatus} />
               )}
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-muted font-medium">
                  <a href={project.url} target="_blank" className="flex items-center hover:text-primary transition-colors">
                     <Globe className="w-4 h-4 mr-2 text-primary/50" />
                     {project.url}
                     <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                  </a>
                  <div className="flex items-center">
                     <Calendar className="w-4 h-4 mr-2 text-primary/50" />
                     Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
               </div>
            </div>
         </div>

         <div className="flex flex-row md:flex-row items-center justify-center gap-4">
            <ScanButton projectId={project.id} projectUrl={project.url} status={scanStatus} />
            <Link 
              href={`/projects/${project.id}?tab=settings`}
              className="w-12 h-12 flex items-center justify-center bg-white/5 border border-border rounded-2xl hover:bg-white/10 transition-colors"
            >
               <SettingsIcon className="w-5 h-5 text-muted" />
            </Link>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-surface border border-border rounded-2xl w-fit">
         <TabLink href={`/projects/${project.id}?tab=overview`} active={currentTab === 'overview'} label="Overview" icon={<Activity className="w-4 h-4" />} />
         <TabLink href={`/projects/${project.id}?tab=scans`} active={currentTab === 'scans'} label="Scan History" icon={<Clock className="w-4 h-4" />} />
         <TabLink href={`/projects/${project.id}?tab=settings`} active={currentTab === 'settings'} label="Settings" icon={<SettingsIcon className="w-4 h-4" />} />
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {currentTab === 'overview' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               {/* Score Radar Chart */}
               <div className="bg-surface/50 p-10 rounded-[40px] border border-border shadow-xl">
                 <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                    <Activity className="w-6 h-6 text-primary" />
                    Performance Metrics
                 </h3>
                 {radarData.length > 0 ? (
                   <ProjectCharts data={radarData} />
                 ) : (
                   <div className="h-[400px] flex items-center justify-center text-muted font-medium italic">
                      No scan data yet. Start an audit to see metrics.
                   </div>
                 )}
               </div>

            </div>

            {/* Recent Findings Summary */}
            <div className="space-y-6">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-3 pl-4">
                 <AlertCircle className="w-6 h-6 text-error" />
                 Critical Findings
               </h3>
               <ScanSummary latestScan={latestScan} />
            </div>
          </div>
        )}

        {currentTab === 'scans' && (
           <div className="bg-surface rounded-3xl border border-border overflow-hidden">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-xs uppercase tracking-widest font-bold text-muted bg-white/5">
                        <th className="p-6">Status</th>
                        <th className="p-6">Overall Score</th>
                        <th className="p-6">Issues Found</th>
                        <th className="p-6">Triggered At</th>
                        <th className="p-6 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                    {project.scans?.map((s: any) => (
                       <tr key={s.id} className="group hover:bg-white/5 transition-colors">
                          <td className="p-6 uppercase font-bold text-[10px]">
                             <span className={cn("px-2 py-1 rounded", s.status === 'complete' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary')}>
                                {s.status}
                             </span>
                          </td>
                          <td className="p-6">
                             <div className="flex items-center gap-3 font-bold">
                                <div className="w-10 h-1 bg-white/10 rounded-full overflow-hidden">
                                   <div className="h-full bg-primary" style={{ width: `${s.overall_score || 0}%` }} />
                                </div>
                                {s.overall_score || '-'}/100
                             </div>
                          </td>
                          <td className="p-6 font-medium text-error flex items-center gap-2">
                             <AlertCircle className="w-4 h-4" />
                             {s.issue_count} findings
                          </td>
                          <td className="p-6 text-xs text-muted">
                             {new Date(s.created_at).toLocaleString()}
                          </td>
                          <td className="p-6 text-right">
                             <Link href={`/scans/${s.id}/report`} className="text-primary hover:underline font-bold text-sm">View Details</Link>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-2xl bg-surface p-10 rounded-[40px] border border-border">
             <h3 className="text-2xl font-bold mb-8">Project Settings</h3>
             <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-sm font-bold uppercase text-muted">Danger Zone</label>
                   <p className="text-sm text-muted mb-4">Deleting this project will permanently remove all historical scans, AI reports, and collected data.</p>
                   <DeleteProjectButton projectId={project.id} />
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabLink({ href, active, label, icon }: any) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all relative overflow-hidden group",
        active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  )
}
