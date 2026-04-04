'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import { cn } from 'utils'

interface FixCodeResult {
  before: string
  after: string
  explanation: string
  language: string
}

function CloseIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
}
function CopyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
}
function LoaderIcon() {
  return <svg className="w-6 h-6 animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}

export default function FixCodeModal({ issueId, issueTitle, onClose }: { issueId: string; issueTitle: string; onClose: () => void }) {
  const [fix, setFix] = useState<FixCodeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { session } = useAuth()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.scans.getFixCode(issueId, session?.access_token || '')
      setFix(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  // Load on mount
  if (!fix && !loading && !error) { load() }

  const copyFixed = () => {
    if (!fix) return
    navigator.clipboard.writeText(fix.after)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const langLabel = { html: 'HTML', css: 'CSS', javascript: 'JavaScript', react: 'React' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="glass-panel-strong max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[22px]"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] p-6">
          <div>
            <h2 className="text-lg font-bold">✦ AI Fix Suggestion</h2>
            <p className="text-sm text-muted-foreground">{issueTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {fix && (
              <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                {langLabel[fix.language as keyof typeof langLabel] || fix.language}
              </span>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground transition-colors">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LoaderIcon />
              <p className="text-muted-foreground text-sm">Generating AI fix suggestion...</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}
          {fix && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full" />Before
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-red-500/20 bg-red-950/10">
                    <SyntaxHighlighter
                      language={fix.language === 'react' ? 'jsx' : fix.language}
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, borderRadius: 0, background: 'transparent', fontSize: '12px' }}
                    >
                      {fix.before}
                    </SyntaxHighlighter>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />After
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-green-500/20 bg-green-950/10">
                    <SyntaxHighlighter
                      language={fix.language === 'react' ? 'jsx' : fix.language}
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, borderRadius: 0, background: 'transparent', fontSize: '12px' }}
                    >
                      {fix.after}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-input/50 p-4 text-sm leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Explanation</p>
                {fix.explanation}
              </div>

              <button
                onClick={copyFixed}
                className={cn(
                  'flex h-11 w-full items-center justify-center gap-2 rounded-xl font-bold transition-[transform,box-shadow]',
                  copied
                    ? 'border border-success/30 bg-success/15 text-success'
                    : 'bg-primary text-primary-foreground shadow-glow-sm hover:shadow-glow active:scale-[0.99]'
                )}
              >
                <CopyIcon />
                {copied ? 'Copied!' : 'Copy Fixed Code'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
