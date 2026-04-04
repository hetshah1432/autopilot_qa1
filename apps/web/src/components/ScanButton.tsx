'use client'

import { Play, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { cn } from 'utils'

export function ScanButton({ 
  projectId, 
  projectUrl, 
  status 
}: { 
  projectId: string, 
  projectUrl: string,
  status?: string 
}) {
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const isBusy =
    isLoading ||
    ['queued', 'crawling', 'analyzing', 'ai_processing', 'ai_progress'].includes(status || '')

  const handleScan = async () => {
    setIsLoading(true)
    const toastId = toast.loading('Initializing scan...', {
       description: `Connecting to ${projectUrl}`
    })

    try {
      await apiClient.scans.create({ project_id: projectId }, session?.access_token || '')
      toast.success('Scan started successfully', {
         id: toastId,
         description: 'You can monitor progress in the history tab.'
      })
      // Trigger a refresh to update the UI status
      window.location.reload()
    } catch (err: any) {
      toast.error('Scan failed to start', {
         id: toastId,
         description: err.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
       disabled={isBusy}
       onClick={handleScan}
       className={cn(
         "flex-1 lg:flex-none h-12 px-8 flex items-center justify-center rounded-2xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
         isBusy 
          ? "bg-white/5 border border-border text-muted" 
          : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-105"
       )}
    >
       {isBusy ? (
         <RefreshCw className="w-4 h-4 mr-3 animate-spin" />
       ) : (
         <Play className="w-5 h-5 mr-3 fill-current" />
       )}
       {isBusy ? 'Audit in Progress...' : 'Run New Audit'}
    </button>
  )
}
