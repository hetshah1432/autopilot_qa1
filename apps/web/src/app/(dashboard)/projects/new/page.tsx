"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  Globe, 
  Type, 
  FileText, 
  Loader2, 
  Search, 
  CheckCircle2,
  X 
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "utils"
import { apiClient } from "@/lib/api"

export default function NewProjectPage() {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { session } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await apiClient.projects.create(
        { name, url, description },
        session?.access_token || ''
      )
 
      // 2. Immediately Trigger Audit
      await apiClient.scans.create(
        { project_id: data.id },
        session?.access_token || ''
      )
 
      toast.success("Initial audit launched! Redirecting...")
      router.push(`/projects/${data.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Link 
        href="/projects" 
        className="inline-flex items-center text-sm font-semibold text-muted hover:text-primary transition-colors mb-10 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to projects
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Launch New Project</h1>
          <p className="text-muted text-lg">Input your website details to begin the AI audit process.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
             <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Type className="w-4 h-4" />
                Project Name
             </label>
             <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Acme SaaS Marketing Site"
                className="w-full bg-white/5 border border-border px-5 py-4 rounded-2xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
             />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website URL
             </label>
             <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                   <LinkIcon className="w-4 h-4 text-muted/50 group-focus-within:text-primary" />
                </div>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://acme.com"
                    className="w-full bg-white/5 border border-border pl-12 pr-5 py-4 rounded-2xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                />
             </div>
             <p className="text-[10px] text-muted ml-5 italic">Must be accessible publicly for our crawler.</p>
          </div>

          <div className="space-y-3">
             <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description (Optional)
             </label>
             <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Internal notes about this project..."
                className="w-full bg-white/5 border border-border px-5 py-4 rounded-2xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30 resize-none"
             />
          </div>

          <div className="pt-6">
             <button
                type="submit"
                disabled={loading}
                className={cn(
                   "w-full h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3",
                   !loading && "hover:scale-[1.02] hover:bg-primary/90"
                )}
             >
                {loading ? (
                   <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Validating & Launching...
                   </>
                ) : (
                   <>
                      <CheckCircle2 className="w-6 h-6" />
                      Launch Website Audit
                   </>
                )}
             </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  )
}
