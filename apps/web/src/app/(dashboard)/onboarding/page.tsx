'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { CheckCircle2, Globe, Layout, Rocket, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from 'utils'

const STEPS = [
  { id: 1, title: 'Welcome', description: 'Join the next generation of web auditing.' },
  { id: 2, title: 'Project', description: 'Connect your first website to scan.' },
  { id: 3, title: 'Initial Audit', description: 'Run your first AI-powered analysis.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { session, user } = useAuth()
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)

  const handleCreateProject = async () => {
    if (!projectName || !projectUrl) return toast.error('Please fill all fields')
    setIsLoading(true)
    try {
      const res = await apiClient.projects.create({ name: projectName, url: projectUrl }, session?.access_token || '')
      setProjectId(res.id)
      setStep(3)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartScan = async (preset: string) => {
    if (!projectId) return
    setIsLoading(true)
    try {
      let config = { depth: 1, max_pages: 5 }
      if (preset === 'standard') config = { depth: 2, max_pages: 20 }
      if (preset === 'deep') config = { depth: 3, max_pages: 50 }

      const res = await apiClient.scans.create({ project_id: projectId, config }, session?.access_token || '')
      toast.success('Your first audit has started!')
      router.push(`/projects/${projectId}/scan/${res.scanId}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background">
      <div className="max-w-xl w-full">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 space-y-2">
              <div className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                step >= s.id ? "bg-indigo-500" : "bg-white/10"
              )} />
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                step === s.id ? "text-indigo-400" : "text-muted-foreground"
              )}>{s.title}</p>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 text-center"
            >
              <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-indigo-500/20">
                👋
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">
                  Welcome to Autopilot QA, <span className="text-indigo-400">{user?.user_metadata?.full_name || 'Auditor'}</span>!
                </h1>
                <p className="text-[#64748b] text-lg max-w-sm mx-auto">
                  AI-powered website auditing. Scan, analyze, and fix issues automatically.
                </p>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all group"
              >
                Let's set up your first project
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">What are we auditing?</h2>
                <p className="text-[#64748b]">Enter the details of the website you want to monitor.</p>
              </div>

              <div className="space-y-4 bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Project Name</label>
                  <div className="relative group">
                    <Layout className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="My SaaS App"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-12 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Website URL</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-12 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCreateProject}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Project →'}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-sm text-[#64748b] hover:text-white transition-colors">Back</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Launch your first audit</h2>
                <p className="text-[#64748b]">Select a preset to begin analyzing your website.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'quick', title: 'Quick Scan', desc: '5 pages, essential checks', icon: '⚡' },
                  { id: 'standard', title: 'Standard Scan', desc: '20 pages, recommended', icon: '🎯' },
                  { id: 'deep', title: 'Deep Scan', desc: '50 pages, full context', icon: '💎' },
                ].map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => handleStartScan(p.id)}
                    disabled={isLoading}
                    className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-indigo-500/30 transition-all text-left"
                  >
                    <div className="text-4xl">{p.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{p.title}</p>
                      <p className="text-sm text-[#64748b]">{p.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
              
              <button 
                 onClick={() => router.push('/dashboard')}
                 className="w-full text-sm text-[#64748b] hover:text-white transition-colors"
              >
                I'll do this later
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
