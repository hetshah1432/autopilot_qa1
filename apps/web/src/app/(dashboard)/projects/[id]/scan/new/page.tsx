"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  ArrowLeft, 
  Search, 
  Globe, 
  Settings2, 
  ChevronDown, 
  ChevronUp,
  Play,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Accessibility,
  Layout,
  Link2
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "utils"

const PRESETS = [
  {
    id: 'quick',
    name: 'Quick Scan',
    description: 'Fast audit of internal links.',
    config: { depth: 1, max_pages: 5, use_js: false, capture_screenshots: false },
    icon: <Zap className="w-5 h-5" />,
    color: 'text-warning'
  },
  {
    id: 'standard',
    name: 'Standard Scan',
    description: 'The recommended thorough audit.',
    config: { depth: 2, max_pages: 20, use_js: true, capture_screenshots: true },
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-primary'
  },
  {
    id: 'deep',
    name: 'Deep Scan',
    description: 'Complete site health check.',
    config: { depth: 3, max_pages: 50, use_js: true, capture_screenshots: true },
    icon: <Search className="w-5 h-5" />,
    color: 'text-success'
  }
]

export default function NewScanPage({ params }: { params: { id: string } }) {
  const [selectedPreset, setSelectedPreset] = useState('standard')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    depth: 2,
    max_pages: 20,
    check_external: false,
    capture_screenshots: true,
    use_js: true,
    modules: {
      seo: true,
      accessibility: true,
      performance: true,
      security: true,
      ux: true,
      broken_links: true
    }
  })

  const router = useRouter()
  const { session } = useAuth()

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset.id)
    setConfig(prev => ({
      ...prev,
      ...preset.config
    }))
  }

  const handleStartScan = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          project_id: params.id,
          config
        })
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      toast.success("Scan initiated! Redirecting to monitor...")
      router.push(`/projects/${params.id}/scan/${data.scanId}`)
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <Link 
        href={`/projects/${params.id}`} 
        className="inline-flex items-center text-sm font-semibold text-muted hover:text-primary transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to project
      </Link>

      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Configure New Scan</h1>
        <p className="text-muted text-lg">Choose a preset or customize your audit parameters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetSelect(preset)}
            className={cn(
              "p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
              selectedPreset === preset.id 
                ? "bg-primary/10 border-primary shadow-xl shadow-primary/10" 
                : "bg-surface border-border hover:border-muted-foreground/30"
            )}
          >
            <div className={cn("mb-4", preset.color)}>{preset.icon}</div>
            <h3 className="font-bold text-xl mb-1">{preset.name}</h3>
            <p className="text-muted text-sm">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-[32px] overflow-hidden mb-10 shadow-xl">
        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4 text-xl font-bold">
            <Settings2 className="w-6 h-6 text-primary" />
            Advanced Configuration
          </div>
          {isAdvancedOpen ? <ChevronUp /> : <ChevronDown />}
        </button>

        {isAdvancedOpen && (
          <div className="p-8 pt-0 border-t border-border bg-black/20 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
              {/* Sliders */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold uppercase tracking-widest text-muted">Crawl Depth</label>
                    <span className="text-primary font-bold">{config.depth}</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" 
                    value={config.depth}
                    onChange={(e) => setConfig({...config, depth: parseInt(e.target.value)})}
                    className="w-full accent-primary bg-border rounded-lg h-2"
                  />
                  <p className="text-xs text-muted-foreground italic">Depth 1: Only home page. Depth 5: Full deep dive.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold uppercase tracking-widest text-muted">Max Pages</label>
                    <span className="text-primary font-bold">{config.max_pages}</span>
                  </div>
                  <input 
                    type="range" min="5" max="100" step="5"
                    value={config.max_pages}
                    onChange={(e) => setConfig({...config, max_pages: parseInt(e.target.value)})}
                    className="w-full accent-primary bg-border rounded-lg h-2"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <Toggle 
                  label="Check External Links" 
                  checked={config.check_external} 
                  onChange={(v) => setConfig({...config, check_external: v})} 
                />
                <Toggle 
                  label="Capture Screenshots" 
                  checked={config.capture_screenshots} 
                  onChange={(v) => setConfig({...config, capture_screenshots: v})} 
                />
                <Toggle 
                  label="JS Rendering (Playwright)" 
                  checked={config.use_js} 
                  onChange={(v) => setConfig({...config, use_js: v})} 
                />
              </div>
            </div>

            {/* Modules */}
            <div>
              <label className="text-sm font-bold uppercase tracking-widest text-muted block mb-6">Analysis Modules</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ModuleToggle 
                  icon={<Globe className="w-4 h-4" />} 
                  label="SEO" 
                  checked={config.modules.seo} 
                  onChange={(v) => setConfig({...config, modules: {...config.modules, seo: v}})}
                />
                <ModuleToggle 
                  icon={<Accessibility className="w-4 h-4" />} 
                  label="A11y" 
                  checked={config.modules.accessibility} 
                  onChange={(v) => setConfig({...config, modules: {...config.modules, accessibility: v}})}
                />
                <ModuleToggle 
                  icon={<Zap className="w-4 h-4" />} 
                  label="Perf" 
                  checked={config.modules.performance} 
                  onChange={(v) => setConfig({...config, modules: {...config.modules, performance: v}})}
                />
                <ModuleToggle 
                  icon={<ShieldCheck className="w-4 h-4" />} 
                  label="Security" 
                  checked={config.modules.security} 
                  onChange={(v) => setConfig({...config, modules: {...config.modules, security: v}})}
                />
                <ModuleToggle 
                  icon={<Layout className="w-4 h-4" />} 
                  label="UX" 
                  checked={config.modules.ux} 
                  onChange={(v) => setConfig({...config, modules: {...config.modules, ux: v}})}
                />
                <ModuleToggle 
                  icon={<Link2 className="w-4 h-4" />} 
                  label="Links" 
                  checked={config.modules.broken_links} 
                  onChange={(v) => setConfig({...config, modules: {...config.modules, broken_links: v}})}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleStartScan}
        disabled={loading}
        className="w-full h-20 bg-primary text-white text-2xl font-black rounded-[32px] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : (
          <>
            <Play className="w-8 h-8 fill-current" />
            START GLOBAL AUDIT
          </>
        )}
      </button>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-border">
      <span className="text-sm font-medium">{label}</span>
      <button 
        onClick={() => onChange(!checked)}
        className={cn(
          "w-12 h-6 rounded-full relative transition-colors duration-200",
          checked ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
          checked ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  )
}

function ModuleToggle({ icon, label, checked, onChange }: { icon: any, label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border transition-all",
        checked 
          ? "bg-primary/20 border-primary text-primary" 
          : "bg-white/5 border-border text-muted-foreground hover:border-muted-foreground/30"
      )}
    >
      {icon}
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  )
}
