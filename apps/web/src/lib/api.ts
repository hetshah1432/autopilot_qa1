const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'API error')
  return data.data
}

export const apiClient = {
  projects: {
    list: (token: string) => apiFetch('/api/projects', {}, token),
    get: (id: string, token: string) => apiFetch(`/api/projects/${id}`, {}, token),
    create: (body: any, token: string) => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(body) }, token),
    update: (id: string, body: any, token: string) => apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
    delete: (id: string, token: string) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }, token),
  },
  scans: {
    list: (projectId: string, token: string) => apiFetch(`/api/scans?projectId=${projectId}`, {}, token),
    get: (id: string, token: string) => apiFetch(`/api/scans/${id}`, {}, token),
    create: (body: any, token: string) => apiFetch('/api/scans', { method: 'POST', body: JSON.stringify(body) }, token),
    delete: (id: string, token: string) => apiFetch(`/api/scans/${id}`, { method: 'DELETE' }, token),
    chat: (id: string, messages: any[], token: string) => apiFetch(`/api/scans/${id}/chat`, { method: 'POST', body: JSON.stringify({ messages }) }, token),
    getFixCode: (issueId: string, token: string) => apiFetch(`/api/scans/issues/${issueId}/fix-code`, { method: 'POST' }, token),
    submitFallback: (id: string, body: any, token: string) => apiFetch(`/api/scans/${id}/fallback/raw-html`, { method: 'POST', body: JSON.stringify(body) }, token),
  },
  reports: {
    getPublic: (token: string) => apiFetch(`/api/reports/public/${token}`),
  },
}
