'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, AlertCircle, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 text-foreground">
      {/* Background Decor */}
      <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-accent/10 blur-[120px] delay-1000" />
      
      <div className="max-w-md w-full text-center space-y-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-primary shadow-elevated">
             <AlertCircle className="w-12 h-12" />
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">404</h1>
          <h2 className="text-2xl font-bold italic tracking-wider uppercase opacity-80">Page Lost in Orbit</h2>
          <p className="mx-auto max-w-[280px] font-medium leading-relaxed text-muted">
            The resource you are looking for has been moved or deleted from the audit registry.
          </p>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="flex flex-col gap-4"
        >
          <Link 
            href="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-glow transition-all hover:scale-[1.02]"
          >
            <Home className="w-4 h-4" /> Return to Dashboard
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-foreground transition-all hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </motion.div>

        <div className="flex justify-center gap-8 pt-12 text-muted">
           <div className="group flex cursor-help flex-col items-center gap-1">
              <div className="h-1 w-8 rounded-full bg-primary transition-all group-hover:w-12" />
              <p className="text-[10px] font-black uppercase tracking-widest">Active Core</p>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-help">
              <div className="w-8 h-1 bg-green-500 rounded-full transition-all group-hover:w-12" />
              <p className="text-[10px] font-black uppercase tracking-widest">Systems Online</p>
           </div>
        </div>
      </div>
    </div>
  )
}
