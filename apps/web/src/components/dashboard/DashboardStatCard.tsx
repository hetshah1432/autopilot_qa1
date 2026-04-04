'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

type DashboardStatCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  description: string
  index?: number
}

export function DashboardStatCard({
  title,
  value,
  icon,
  description,
  index = 0,
}: DashboardStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/90 p-6 shadow-soft backdrop-blur-sm transition-shadow duration-300 hover:border-primary/35 hover:shadow-glow-sm"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-accent/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-center justify-between mb-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3 shadow-inner">{icon}</div>
        <div className="rounded-full bg-primary/10 p-1.5 transition-transform duration-300 group-hover:rotate-45">
          <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <h4 className="relative mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h4>
      <div className="relative mb-2 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      <p className="relative text-xs font-medium text-muted">{description}</p>
    </motion.div>
  )
}
