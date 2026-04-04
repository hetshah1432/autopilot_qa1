"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()
  const { session } = useAuth()

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true)
      return
    }

    setLoading(true)
    try {
      await apiClient.projects.delete(projectId, session?.access_token || '')
      toast.success("Project deleted successfully")
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      toast.error("Failed to delete project")
      setLoading(false)
      setConfirm(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-error/10 text-error hover:bg-error hover:text-white transition-all font-bold disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Trash2 className="w-5 h-5" />
      )}
      {loading ? "Deleting..." : confirm ? "Click again to confirm" : "Delete Project Permanently"}
    </button>
  )
}
