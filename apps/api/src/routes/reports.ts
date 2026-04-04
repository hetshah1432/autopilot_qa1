import { Router, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = Router()

router.get('/public/:token', async (req: any, res: Response) => {
  const { data: scan, error } = await supabase
    .from('scans')
    .select(`
      *,
      pages (*),
      issues (*),
      scan_scores (*),
      projects (name, url)
    `)
    .eq('public_token', req.params.token)
    .single()

  if (error || !scan) {
    return res.status(404).json({ success: false, error: 'Report not found' })
  }

  if (scan.status !== 'complete') {
    return res.status(202).json({ 
      success: false, 
      error: 'Processing', 
      message: 'AI is finalizing this report. Please refresh in a few seconds.' 
    })
  }

  return res.json({ success: true, data: scan })
})

export default router
