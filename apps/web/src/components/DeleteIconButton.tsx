"use client"

import { useState } from "react"
import { Trash2, Loader2, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "utils"

export function DeleteIconButton({ projectId, onSuccess }: { projectId: string, onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { session } = useAuth()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 3000) // Reset after 3s
      return
    }

    setLoading(true)
    try {
      await apiClient.projects.delete(projectId, session?.access_token || '')
      toast.success("Project deleted")
      if (onSuccess) onSuccess()
      else window.location.reload()
    } catch (err: any) {
      toast.error("Delete failed")
      setLoading(false)
      setConfirm(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className={cn(
        "p-2 rounded-xl border transition-all flex items-center justify-center gap-2",
        confirm 
          ? "bg-red-500 text-white border-red-500 scale-105 px-3" 
          : "bg-white/5 border-white/10 text-muted hover:text-red-400 hover:bg-red-400/10",
        loading && "opacity-50 cursor-not-allowed"
      )}
      title={confirm ? "Click again to confirm" : "Delete Project"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : confirm ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      {confirm && <span className="text-[10px] font-black uppercase">Confirm?</span>}
    </button>
  )
}
