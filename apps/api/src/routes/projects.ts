import { Router, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'
import axios from 'axios'
import { z } from 'zod'

const router = Router()

const ProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Invalid website URL"),
  description: z.string().optional()
})

// List projects
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      scans (
        id,
        status,
        overall_score,
        created_at,
        issue_count
      )
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ success: false, error: error.message })

  return res.json({ success: true, data })
})

// Create project
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = ProjectSchema.parse(req.body)
    
    // 1. Check for unique project name (per user)
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', req.user!.id)
      .ilike('name', validated.name)
      .maybeSingle()

    if (existingProject) {
       return res.status(400).json({ 
         success: false, 
         error: `A project named "${validated.name}" already exists. Please choose a unique name.` 
       })
    }

    // 2. Validate URL accessibility
    try {
      // Some sites block HEAD, so we use GET but only fetch a tiny part (if possible) 
      // or just check the status code
      await axios.get(validated.url, { timeout: 7000, validateStatus: (status) => status < 500 })
    } catch (err) {
      return res.status(400).json({ success: false, error: "Website URL is not accessible" })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...validated,
        user_id: req.user!.id
      })
      .select()
      .single()

    if (error) return res.status(500).json({ success: false, error: error.message })

    return res.json({ success: true, data })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message })
    }
    return res.status(500).json({ success: false, error: "Internal Server Error" })
  }
})

// Get single project
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      scans (
        *,
        scan_scores (*)
      )
    `)
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .single()

  if (error) return res.status(404).json({ success: false, error: "Project not found" })

  return res.json({ success: true, data })
})

// Update project
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const validated = ProjectSchema.partial().parse(req.body)
  
  const { data, error } = await supabase
    .from('projects')
    .update(validated)
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .select()
    .single()

  if (error) return res.status(500).json({ success: false, error: error.message })

  return res.json({ success: true, data })
})

// Delete project
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)

  if (error) return res.status(500).json({ success: false, error: error.message })

  return res.json({ success: true, data: null })
})

export default router
