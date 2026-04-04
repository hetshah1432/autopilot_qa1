import { createClient } from "@/lib/supabase/server"
import type { Project, Scan } from "types"
import {
  TrendingUp,
  ArrowUpRight,
  Layers,
  Activity,
  AlertCircle,
  Clock,
  Play,
} from "lucide-react"
import Link from "next/link"
import { DashboardCharts } from "@/components/DashboardCharts"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"

import { cn } from "utils"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type ScanWithProject = {
  id: string
  project_id: string
  status: string
  overall_score?: number
  issue_count?: number
  created_at: string
  projects?: { name: string } | null
}

type ProjectWithScans = {
  id: string
  name: string
  url: string
  user_id: string
  scans?: Array<{
    id: string
    overall_score?: number
    issue_count?: number
    created_at?: string
  }>
}

export default async function DashboardPage({ searchParams }: { searchParams: { timeframe?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect("/login")

  const timeframe = searchParams.timeframe || "ALL"

  const [projectsRes, scansRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, url, user_id, scans(id, overall_score, issue_count)")
      .eq("user_id", user.id),
    supabase
      .from("scans")
      .select("id, project_id, status, overall_score, issue_count, created_at, projects(name), scan_scores(overall)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  const projects = projectsRes.data as unknown as ProjectWithScans[]
  const scans = scansRes.data as unknown as ScanWithProject[]

  const now = new Date()
  const filteredScans = (scans || []).filter((s: ScanWithProject) => {
    if (timeframe === "ALL") return true
    const scanDate = new Date(s.created_at)
    const diffDays = (now.getTime() - scanDate.getTime()) / (1000 * 3600 * 24)
    if (timeframe === "1W") return diffDays <= 7
    if (timeframe === "1M") return diffDays <= 30
    if (timeframe === "1Y") return diffDays <= 365
    return true
  })

  const totalProjects = projects?.length || 0
  const totalScans = scans?.length || 0

  const totalIssues =
    projects?.reduce((acc, p) => acc + (p.scans?.[0]?.issue_count || 0), 0) || 0

  const avgScore =
    scans && scans.length > 0
      ? Math.round(scans.reduce((acc, s) => acc + (s.overall_score || 0), 0) / scans.length)
      : 0

  const trendData =
    [...filteredScans].reverse().map((s) => ({
      name: new Date(s.created_at).toLocaleDateString(),
      uniqueName: `${new Date(s.created_at).toLocaleDateString()} - ${s.id.slice(0, 4)}`,
      score: s.overall_score || 0,
    })) || []

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Dashboard Home</h1>
          <p className="text-lg text-muted">Here is what is happening across your projects.</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-8 font-semibold text-primary-foreground shadow-glow transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-glow active:scale-[0.98]"
        >
          <Play className="mr-2 h-5 w-5 fill-current" />
          Create New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          index={0}
          title="Total Projects"
          value={totalProjects}
          icon={<Layers className="h-6 w-6 text-primary" />}
          description="Active websites managed"
        />
        <DashboardStatCard
          index={1}
          title="Total Scans"
          value={totalScans}
          icon={<ArrowUpRight className="h-6 w-6 text-success" />}
          description="Audits completed since start"
        />
        <DashboardStatCard
          index={2}
          title="Avg Health Score"
          value={`${avgScore}%`}
          icon={<Activity className="h-6 w-6 text-warning" />}
          description="Aggregate performance score"
        />
        <DashboardStatCard
          index={3}
          title="Total Issues"
          value={totalIssues}
          icon={<AlertCircle className="h-6 w-6 text-error" />}
          description="Open findings needing repair"
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="glass-panel-strong relative overflow-hidden rounded-[22px] p-8 lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Health Score Trend
            </h3>
            <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
              {["1W", "1M", "1Y", "ALL"].map((tf) => (
                <Link
                  key={tf}
                  href={`?timeframe=${tf}`}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-[10px] font-black transition-all",
                    timeframe === tf
                      ? "bg-primary text-primary-foreground shadow-glow-sm"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {tf}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative h-[300px] w-full">
            <DashboardCharts data={trendData} />
          </div>
        </div>

        <div className="glass-panel-strong flex flex-col rounded-[22px] p-8">
          <h3 className="mb-6 flex items-center justify-between text-xl font-bold">
            Recent Projects
            <Link href="/projects" className="text-xs font-semibold text-primary hover:underline">
              View All
            </Link>
          </h3>
          <div className="flex flex-1 flex-col space-y-4">
            {projects?.slice(0, 3).map((p: ProjectWithScans) => (
              <div
                key={p.id}
                className="group rounded-2xl border border-white/[0.06] p-4 transition-all hover:border-primary/25 hover:bg-white/[0.03]"
              >
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="max-w-[120px] truncate font-bold">{p.name}</span>
                  <HealthBadge score={p.scans?.[0]?.overall_score || 0} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="max-w-[150px] truncate text-xs text-muted">{p.url}</p>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary transition-all hover:scale-105 hover:bg-primary hover:text-white"
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </Link>
                </div>
              </div>
            ))}
            {!projects?.length && <EmptyList message="No projects yet" />}
          </div>
        </div>
      </div>

      <div className="glass-panel-strong rounded-[22px] p-8">
        <h3 className="mb-6 text-xl font-bold">Recent Scans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="pb-4 font-semibold">Status</th>
                <th className="pb-4 font-semibold">Project</th>
                <th className="pb-4 font-semibold">Overall Score</th>
                <th className="pb-4 font-semibold">Issues</th>
                <th className="pb-4 text-right font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {scans?.slice(0, 5).map((s: ScanWithProject) => (
                <tr key={s.id} className="group transition-colors hover:bg-white/[0.03]">
                  <td className="py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-4">
                    <Link
                      href={`/projects/${s.project_id}`}
                      className="font-medium transition-colors hover:text-primary"
                    >
                      {s.projects?.name}
                    </Link>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{s.overall_score || "-"}</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(139,124,255,0.5)]"
                          style={{
                            width: `${s.overall_score || 0}%`,
                            backgroundColor: getHealthColor(s.overall_score || 0),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-xs">{s.issue_count} findings</td>
                  <td className="py-4 text-right text-xs text-muted">
                    <div className="flex items-center justify-end gap-1 font-semibold uppercase">
                      <Clock className="h-3 w-3" />
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!scans?.length && (
            <div className="py-20 text-center">
              <p className="text-muted">No scan history recorded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-muted/30 text-muted-foreground border border-white/10",
    crawling: "border border-primary/30 bg-primary/15 text-primary animate-pulse",
    analyzing: "border border-warning/30 bg-warning/10 text-warning animate-pulse",
    ai_processing: "border border-accent/30 bg-accent/10 text-accent animate-pulse",
    complete: "border border-success/30 bg-success/10 text-success",
    failed: "border border-error/30 bg-error/10 text-error",
  }
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-1 text-[10px] font-bold uppercase",
        styles[status] || styles.queued
      )}
    >
      {status}
    </span>
  )
}

function HealthBadge({ score }: { score: number }) {
  const color = getHealthColor(score)
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${color}22`, color: color, boxShadow: `0 0 16px -4px ${color}55` }}
    >
      {score}% Health
    </span>
  )
}

function getHealthColor(score: number): string {
  if (score < 40) return "#f87171"
  if (score < 60) return "#fb923c"
  if (score < 75) return "#fbbf24"
  return "#34d399"
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 opacity-50">
      <p className="text-xs">{message}</p>
    </div>
  )
}
