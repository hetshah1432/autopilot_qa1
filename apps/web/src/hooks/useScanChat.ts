'use client'

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { apiClient } from '@/lib/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function useScanChat(scanId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { session } = useAuth()

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const result = await apiClient.scans.chat(scanId, apiMessages, session?.access_token || '')
      const assistantMsg: ChatMessage = { role: 'assistant', content: result.message, timestamp: new Date() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errMsg: ChatMessage = { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}`, timestamp: new Date() }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, scanId, session])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, sendMessage, isLoading, clearMessages }
}
