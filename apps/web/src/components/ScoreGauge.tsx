"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export const ScoreGauge = ({ 
  score, 
  size = 120, 
  strokeWidth = 10, 
  className = "",
  showText = true 
}: ScoreGaugeProps) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  const getColor = (s: number) => {
    if (s < 40) return "#ef4444" // score.critical
    if (s < 60) return "#f97316" // score.high
    if (s < 75) return "#f59e0b" // score.medium
    return "#22c55e"             // success
  }

  const scoreColor = useMemo(() => getColor(score), [score])

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        {/* Progress Circle */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          fill="transparent"
          style={{ 
             filter: `drop-shadow(0 0 10px ${scoreColor}44)`
          }}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="font-bold leading-none tracking-tight"
            style={{ 
              fontSize: size * 0.25, 
              color: score === null ? '#64748b' : scoreColor 
            }}
          >
            {score === null ? '--' : Math.round(score)}
          </motion.span>
          <span 
            className="text-muted-foreground uppercase font-semibold tracking-widest mt-0.5"
            style={{ fontSize: size * 0.08 }}
          >
            Score
          </span>
        </div>
      )}
    </div>
  )
}
