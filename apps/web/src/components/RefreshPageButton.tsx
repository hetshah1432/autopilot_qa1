'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from 'utils'

export function RefreshPageButton() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn(
        "p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-foreground transition-all disabled:opacity-50",
        isRefreshing && "animate-spin"
      )}
      title="Refresh Page Data"
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  )
}
