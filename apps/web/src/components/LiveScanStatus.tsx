'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Globe,
  Search,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from 'utils'

const STEPS = [
  { id: 'queued', label: 'Queued', Icon: Loader2 },
  { id: 'crawling', label: 'Crawling', Icon: Globe },
  { id: 'analyzing', label: 'Analyzing', Icon: Search },
  { id: 'ai_processing', label: 'AI review', Icon: Sparkles },
] as const

const PIPELINE = ['queued', 'crawling', 'analyzing', 'ai_processing'] as const

function normalizeStatus(s: string) {
  if (s === 'ai_progress') return 'ai_processing'
  return s
}

function stepIndex(status: string) {
  const n = normalizeStatus(status)
  const i = PIPELINE.indexOf(n as (typeof PIPELINE)[number])
  return i >= 0 ? i : 0
}

export function LiveScanStatus({
  scanId,
  initialStatus,
}: {
  scanId: string
  initialStatus: string
}) {
  const { session } = useAuth()
  const router = useRouter()
  const token = session?.access_token

  const { data: scan } = useQuery({
    queryKey: ['scan-live', scanId],
    queryFn: () => apiClient.scans.get(scanId, token || ''),
    enabled: !!token && !!scanId,
    refetchInterval: (q) => {
      const s = q.state.data?.status as string | undefined
      if (!s) return 2500
      if (['complete', 'failed', 'completed_with_errors'].includes(s)) return false
      return 2500
    },
  })

  const status = normalizeStatus((scan?.status as string) || initialStatus)
  const activeIdx = stepIndex(status)
  const terminal = ['complete', 'failed', 'completed_with_errors'].includes(status)

  useEffect(() => {
    if (terminal) {
      const t = setTimeout(() => router.refresh(), 400)
      return () => clearTimeout(t)
    }
  }, [terminal, router])

  if (terminal) return null

  const elapsedHint =
    'Most audits finish in about 3–8 minutes. You can leave this page — status updates automatically.'

  return (
    <div className="relative mt-8 overflow-hidden rounded-[22px] border border-primary/20 bg-card/60 p-6 shadow-glow-sm backdrop-blur-md md:p-8">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Live
            </span>
            <span className="text-xs text-muted">Checking every few seconds — no refresh needed</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight md:text-xl">Audit running</h3>
          <p className="text-sm text-muted">{elapsedHint}</p>
        </div>

        {/* Step rail */}
        <div className="relative">
          <div className="absolute left-0 right-0 top-[22px] h-px bg-white/10" aria-hidden />
          <ol className="relative grid grid-cols-4 gap-2">
            {STEPS.map((step, i) => {
              const done = i < activeIdx
              const active = i === activeIdx
              const Icon = step.Icon
              return (
                <li key={step.id} className="flex flex-col items-center text-center">
                  <motion.div
                    initial={false}
                    animate={
                      active
                        ? { scale: [1, 1.06, 1] }
                        : { scale: 1 }
                    }
                    transition={active ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } : {}}
                    className={cn(
                      'relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition-colors',
                      done && 'border-success/60 bg-success/10 text-success',
                      active &&
                        'border-primary bg-primary/15 text-primary shadow-[0_0_24px_-6px_rgba(139,124,255,0.6)]',
                      !done && !active && 'border-white/10 bg-surface/80 text-muted'
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : active ? (
                      <Icon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Icon className="h-5 w-5 opacity-50" />
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      'mt-2 text-[10px] font-bold uppercase tracking-wider',
                      active ? 'text-foreground' : 'text-muted'
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm md:flex-row">
          <div className="flex items-center gap-2 font-medium capitalize text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Current stage:{' '}
            <span className="text-primary">{normalizeStatus(status).replace(/_/g, ' ')}</span>
          </div>
          {typeof scan?.issue_count === 'number' && scan.issue_count > 0 && (
            <span className="text-xs text-muted">
              {scan.issue_count} finding{scan.issue_count === 1 ? '' : 's'} recorded so far
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
