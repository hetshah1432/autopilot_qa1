'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useScans(projectId?: string) {
  const { session } = useAuth()
  
  return useQuery({
    queryKey: ['scans', projectId],
    queryFn: () => apiClient.scans.list(projectId || '', session?.access_token || ''),
    enabled: !!session?.access_token,
  })
}

export function useScan(id: string) {
  const { session } = useAuth()
  
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => apiClient.scans.get(id, session?.access_token || ''),
    enabled: !!session?.access_token && !!id,
  })
}

export function useCreateScan() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ projectId, config }: { projectId: string, config: any }) => 
      apiClient.scans.create({ project_id: projectId, config }, session?.access_token || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scans', variables.projectId] })
      toast.success('Scan started successfully')
      router.push(`/projects/${variables.projectId}/scan/${data.scanId}`)
    },
    onError: (error: any) => {
      toast.error(`Failed to start scan: ${error.message}`)
    }
  })
}

export function useDeleteScan(projectId?: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.scans.delete(id, session?.access_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans', projectId] })
      toast.success('Scan deleted')
    },
    onError: (error: any) => {
      toast.error(`Failed to delete scan: ${error.message}`)
    }
  })
}
