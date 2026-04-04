'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useScanProgress, type ScanStatus } from '@/hooks/useScanProgress'
import { useRouter } from 'next/navigation'
import { cn } from 'utils'
import Link from 'next/link'

const STAGES: { key: ScanStatus; label: string; icon: string }[] = [
  { key: 'queued', label: 'Queued', icon: '⏳' },
  { key: 'crawling', label: 'Crawling', icon: '🔍' },
  { key: 'analyzing', label: 'Analyzing', icon: '📊' },
  { key: 'ai_processing', label: 'AI Processing', icon: '🤖' },
  { key: 'complete', label: 'Complete', icon: '✅' },
]

const STAGE_ORDER = ['queued', 'crawling', 'analyzing', 'ai_processing', 'complete']

function getStageStatus(stage: string, currentStatus: string) {
  const cur =
    currentStatus === 'completed_with_errors'
      ? 'complete'
      : currentStatus === 'ai_progress'
        ? 'ai_processing'
        : currentStatus
  const currentIdx = STAGE_ORDER.indexOf(cur)
  const stageIdx = STAGE_ORDER.indexOf(stage)
  if (currentStatus === 'failed') return stageIdx <= currentIdx ? 'failed' : 'pending'
  if (stageIdx < currentIdx) return 'complete'
  if (stageIdx === currentIdx) return 'active'
  return 'pending'
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  return `${h > 0 ? h + ':' : ''}${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function getMsgColor(status: string) {
  if (status === 'crawling') return 'text-[#93c5fd]'
  if (status === 'complete') return 'text-[#86efac]'
  if (status === 'failed') return 'text-[#fca5a5]'
  if (status === 'ai_processing') return 'text-[#d8b4fe]'
  return 'text-[#f1f5f9]'
}

export default function ScanProgressPage({ params }: { params: { id: string; scanId: string } }) {
  const router = useRouter()
  const { status, logs, stats, error, isConnected } = useScanProgress(params.scanId)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const redirectTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    if (status === 'complete' || status === 'completed_with_errors') {
      if (typeof window !== 'undefined') {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } })
        }).catch(() => {})
      }
      redirectTimer.current = setTimeout(() => {
        router.push(`/scans/${params.scanId}/report`)
      }, 4000)
    }
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current) }
  }, [status, params.scanId, router])

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Scan Monitor</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            scan/{params.scanId.slice(0, 8)}...
            <span className={cn('ml-3 font-bold', isConnected ? 'text-green-400' : 'text-muted-foreground')}>
              ● {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </p>
        </div>
        {(status === 'complete' || status === 'completed_with_errors') && (
          <div className="text-xs text-muted-foreground animate-pulse">Auto-redirecting in 4s...</div>
        )}
      </div>

      {/* Stage Pipeline */}
      <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6">
        <div className="flex items-center justify-between relative">
          {STAGES.map((stage, i) => {
            const stageStatus = getStageStatus(stage.key, status)
            const isLast = i === STAGES.length - 1
            return (
              <div key={stage.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 z-10">
                  <motion.div
                    animate={stageStatus === 'active' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={cn(
                      'w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg transition-all duration-500',
                      stageStatus === 'active' && 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]',
                      stageStatus === 'complete' && 'bg-green-500/20 border-green-500',
                      stageStatus === 'failed' && 'bg-red-500/20 border-red-500',
                      stageStatus === 'pending' && 'bg-[#1e1e2e] border-[#2a2a3e]',
                    )}
                  >
                    {stageStatus === 'complete' ? '✓' : stage.icon}
                  </motion.div>
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-widest whitespace-nowrap',
                    stageStatus === 'active' && 'text-indigo-400',
                    stageStatus === 'complete' && 'text-green-400',
                    stageStatus === 'failed' && 'text-red-400',
                    stageStatus === 'pending' && 'text-muted-foreground',
                  )}>{stage.label}</span>
                </div>
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-2 overflow-hidden bg-[#1e1e2e]">
                    <motion.div
                      className="h-full bg-green-500"
                      initial={{ width: '0%' }}
                      animate={{ width: getStageStatus(stage.key, status) === 'complete' ? '100%' : '0%' }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pages Crawled" value={stats.pagesCrawled} />
        <StatCard label="Issues Found" value={stats.issuesFound} />
        <StatCard label="Elapsed" value={formatElapsed(stats.elapsedMs)} />
        <StatCard label="Stage" value={status.replace('_', ' ')} uppercase />
      </div>

      {/* Terminal Log */}
      <div className="bg-[#050508] border border-[#1e1e2e] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e2e] flex items-center justify-between bg-[#0d0d14]">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-green-400">$</span> LIVE EXECUTION LOG
          </span>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
        </div>
        <div className="h-72 overflow-y-auto p-5 font-mono text-sm space-y-1.5">
          {logs.length === 0 && (
            <span className="text-muted-foreground opacity-50">Awaiting engine startup...</span>
          )}
          {logs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
              <span className="text-[#64748b] shrink-0">
                [{new Date(log.created_at).toLocaleTimeString([], { hour12: false })}]
              </span>
              <span className={getMsgColor(log.status)}>{log.message}</span>
            </motion.div>
          ))}
          <div ref={logsEndRef} />
          {status !== 'complete' && status !== 'completed_with_errors' && status !== 'failed' && (
            <span className="text-indigo-400 animate-pulse">█</span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(status === 'complete' || status === 'completed_with_errors') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-4xl mx-auto"
            >
              ✓
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">Scan Complete!</h2>
              <p className="text-muted-foreground">Your audit results are ready. Redirecting to report...</p>
            </div>
            <div className="flex gap-4 justify-center">
              <Link href={`/scans/${params.scanId}/report`} className="px-8 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors">
                View Full Report
              </Link>
              <Link href={`/projects/${params.id}/scan/new`} className="px-8 py-3 bg-[#1e1e2e] text-foreground font-bold rounded-xl hover:bg-[#2a2a3e] transition-colors border border-[#2a2a3e]">
                Start New Scan
              </Link>
            </div>
          </motion.div>
        )}
        {status === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">✗</div>
            <h2 className="text-xl font-bold text-red-400">Scan Failed</h2>
            <p className="text-muted-foreground text-sm">{error || 'An unexpected error occurred.'}</p>
            <div className="flex gap-4 justify-center">
              <Link href={`/projects/${params.id}/scan/new`} className="px-6 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-colors">
                Retry Scan
              </Link>
              <Link href={`/projects/${params.id}`} className="px-6 py-2 bg-[#1e1e2e] text-foreground font-bold rounded-xl hover:bg-[#2a2a3e] transition-colors">
                Back to Project
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, uppercase }: { label: string; value: string | number; uppercase?: boolean }) {
  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-xl font-bold font-mono', uppercase && 'capitalize')}>{value || '—'}</p>
    </div>
  )
}
