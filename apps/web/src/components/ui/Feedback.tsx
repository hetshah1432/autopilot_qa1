'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({ 
  isOpen, 
  title, 
  description, 
  confirmLabel, 
  confirmVariant = 'default',
  onConfirm, 
  onCancel 
}: ConfirmDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-muted text-sm mb-8">{description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                className={`flex-1 px-6 py-3 font-bold rounded-xl transition-opacity hover:opacity-90 ${
                  confirmVariant === 'danger' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <div className="absolute inset-0 blur-lg bg-primary/20 rounded-full animate-pulse" />
    </div>
  </div>
)

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  action?: { label: string, onClick: () => void } 
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-card/40 border border-border rounded-3xl space-y-6">
    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
      <Icon className="w-8 h-8" />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-muted text-sm max-w-[280px] mx-auto">{description}</p>
    </div>
    {action && (
      <button 
        onClick={action.onClick}
        className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
      >
        {action.label}
      </button>
    )}
  </div>
)
