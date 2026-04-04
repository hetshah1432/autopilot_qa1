'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const MAX_RECONNECT = 8

export type ScanStatus =
  | 'queued'
  | 'crawling'
  | 'analyzing'
  | 'ai_processing'
  | 'complete'
  | 'failed'
  | 'completed_with_errors'

export interface LogEntry {
  id: string
  status: ScanStatus
  message: string
  created_at: string
  rawType?: string
}

export interface ScanProgressState {
  status: ScanStatus
  logs: LogEntry[]
  stats: { pagesCrawled: number; issuesFound: number; elapsedMs: number; aiPercent: number | null }
  scores: Record<string, number> | null
  error: string | null
  isConnected: boolean
  lastEventAt: number | null
}

/** Map DB event_type + scans.status to a single UI stage */
export function normalizeEventType(eventType: string): ScanStatus {
  if (eventType === 'ai_progress') return 'ai_processing'
  if (eventType === 'completed_with_errors') return 'completed_with_errors'
  if (
    eventType === 'queued' ||
    eventType === 'crawling' ||
    eventType === 'analyzing' ||
    eventType === 'ai_processing' ||
    eventType === 'complete' ||
    eventType === 'failed'
  ) {
    return eventType
  }
  return 'queued'
}

function normalizeDbStatus(s: string): ScanStatus {
  if (s === 'ai_progress') return 'ai_processing'
  if (
    s === 'queued' ||
    s === 'crawling' ||
    s === 'analyzing' ||
    s === 'ai_processing' ||
    s === 'complete' ||
    s === 'failed' ||
    s === 'completed_with_errors'
  ) {
    return s
  }
  return 'queued'
}

const TERMINAL: ScanStatus[] = ['complete', 'failed', 'completed_with_errors']

export function useScanProgress(scanId: string) {
  const { session } = useAuth()
  const token = session?.access_token

  const [state, setState] = useState<ScanProgressState>({
    status: 'queued',
    logs: [],
    stats: { pagesCrawled: 0, issuesFound: 0, elapsedMs: 0, aiPercent: null },
    scores: null,
    error: null,
    isConnected: false,
    lastEventAt: null,
  })

  const esRef = useRef<EventSource | null>(null)
  const reconnectCount = useRef(0)
  const startTime = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closedRef = useRef(false)

  useEffect(() => {
    startTime.current = Date.now()
    timerRef.current = setInterval(() => {
      setState((s) => ({
        ...s,
        stats: { ...s.stats, elapsedMs: Date.now() - startTime.current },
      }))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Seed from REST so UI matches DB immediately (SSE may connect a tick later)
  useEffect(() => {
    if (!scanId || !token) return
    let cancelled = false
    ;(async () => {
      try {
        const scan = await apiClient.scans.get(scanId, token)
        if (cancelled || !scan) return
        const st = normalizeDbStatus(scan.status as string)
        setState((s) => ({
          ...s,
          status: st,
          stats: {
            ...s.stats,
            issuesFound: typeof scan.issue_count === 'number' ? scan.issue_count : s.stats.issuesFound,
          },
        }))
        if (TERMINAL.includes(st)) {
          if (timerRef.current) clearInterval(timerRef.current)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [scanId, token])

  const connect = useCallback(() => {
    if (!token || !scanId) return
    closedRef.current = false
    if (esRef.current) esRef.current.close()

    const url = `${API_URL}/api/scans/${scanId}/events?access_token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setState((s) => ({ ...s, isConnected: true, error: null }))
      reconnectCount.current = 0
    }

    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data) as {
          id: string
          event_type: string
          message: string
          data?: { percentage?: number; issues?: number; [k: string]: unknown }
          created_at: string
        }
        const mapped = normalizeEventType(raw.event_type)
        const entry: LogEntry = {
          id: raw.id,
          status: mapped,
          message: raw.message,
          created_at: raw.created_at,
          rawType: raw.event_type,
        }

        setState((s) => {
          const msg = raw.message.toLowerCase()
          const newStats = { ...s.stats }
          const crawlMatch = msg.match(/crawling page (\d+)/)
          if (crawlMatch) newStats.pagesCrawled = parseInt(crawlMatch[1], 10)
          if (raw.event_type === 'ai_progress' && raw.data && typeof raw.data.percentage === 'number') {
            newStats.aiPercent = raw.data.percentage
          }
          if (mapped === 'complete' || mapped === 'completed_with_errors') {
            const data = raw.data as { issues?: number } | undefined
            if (data && typeof data.issues === 'number') newStats.issuesFound = data.issues
          }

          const nextStatus = mapped
          const newError = mapped === 'failed' ? raw.message : s.error

          return {
            ...s,
            status: nextStatus,
            logs: [...s.logs.slice(-200), entry],
            stats: newStats,
            error: newError,
            lastEventAt: Date.now(),
          }
        })

        if (TERMINAL.includes(mapped)) {
          es.close()
          if (timerRef.current) clearInterval(timerRef.current)
        }
      } catch {
        /* ignore malformed chunks */
      }
    }

    es.addEventListener('close', () => {
      es.close()
      setState((s) => ({ ...s, isConnected: false }))
    })

    es.onerror = () => {
      setState((s) => ({ ...s, isConnected: false }))
      es.close()
      if (closedRef.current) return
      if (reconnectCount.current < MAX_RECONNECT) {
        reconnectCount.current++
        setTimeout(connect, 2000)
      } else {
        setState((s) => ({
          ...s,
          error: s.error || 'Live stream disconnected. Status still updates via the project page.',
        }))
      }
    }
  }, [scanId, token])

  useEffect(() => {
    if (!token || !scanId) return
    connect()
    return () => {
      closedRef.current = true
      esRef.current?.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [connect, scanId, token])

  return state
}
