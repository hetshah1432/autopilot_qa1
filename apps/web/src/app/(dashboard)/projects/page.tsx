import { createClient } from "@/lib/supabase/server"
import { Globe, Plus, Play, ExternalLink, Calendar, Layers } from "lucide-react"
import Link from "next/link"
import { ScoreGauge } from "@/components/ScoreGauge"
import { DeleteIconButton } from "@/components/DeleteIconButton"

import { format } from "date-fns"

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: projects } = await supabase
    .from('projects')
    .select('*, scans(id, status, overall_score, created_at, issue_count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
          <p className="text-muted">Manage your web properties and audits.</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center p-4 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </Link>
      </div>

      {!projects?.length ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl border-2 border-dashed border-border text-center px-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold mb-3">No projects yet</h3>
          <p className="text-muted max-w-sm mb-8 italic">
            Create your first project to start auditing. We will crawl your site and give you a detailed AI report.
          </p>
          <Link
            href="/projects/new"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project: any) => {
            const latestScan = project.scans?.[0]
            const healthScore = latestScan?.overall_score || 0

            return (
              <div
                key={project.id}
                className="group relative bg-surface border border-border rounded-3xl p-6 transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5"
              >
                {/* Gauge and Score */}
                <div className="flex items-start justify-between mb-8">
                   <ScoreGauge score={healthScore} size={80} strokeWidth={6} />
                   <div className="flex items-center gap-2">
                     <DeleteIconButton projectId={project.id} />
                     <Link
                       href={`/projects/${project.id}`}
                       className="p-2 rounded-xl border border-border bg-white/5 text-muted hover:bg-primary hover:text-white transition-all"
                     >
                       <ExternalLink className="w-4 h-4" />
                     </Link>
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold truncate mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                    <div className="flex items-center text-xs text-muted font-medium mb-4 group-hover:text-muted/80 transition-colors">
                      <Globe className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-[200px]">{project.url}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-6 border-b border-border">
                    <div className="bg-white/5 p-3 rounded-2xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Total Scans</p>
                      <p className="text-lg font-bold">{project.scans?.length || 0}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Open Issues</p>
                      <p className="text-lg font-bold text-error">{latestScan?.issue_count || 0}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div className="flex items-center text-xs text-muted text-left">
                      <Calendar className="w-3 h-3 mr-1" />
                      {latestScan ? format(new Date(latestScan.created_at), 'MMM d, yyyy') : 'Never Scanned'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${project.id}?tab=history`}
                        className="flex-1 h-10 px-4 flex items-center justify-center bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white font-bold text-sm transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <Play className="w-3 h-3 mr-2 fill-current" />
                        Scan Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
