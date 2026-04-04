import { Router, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'
import { ScanOrchestrator } from '../engine/orchestrator'
import { ScanConfig } from '../engine/crawl-engine'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// POST Start Scan
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, config: providedConfig } = req.body as { project_id: string, config: ScanConfig }
  
  // Default Config fallback to prevent API crashes
  const config = providedConfig || { 
    depth: 1, 
    max_pages: 25, 
    use_js: true, 
    capture_screenshots: true, 
    check_external: false 
  }
  
  if (!project_id) return res.status(400).json({ success: false, error: "Project ID is required" })

  try {
    // 1. Validate project exists and user owns it
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .select('url')
      .eq('id', project_id)
      .eq('user_id', req.user!.id)
      .single()

    if (projectErr || !project) {
       return res.status(404).json({ success: false, error: "Project not found" })
    }
 
    // 2. Check for active scans (Concurrency Lock)
    const { data: activeScan } = await supabase
      .from('scans')
      .select('id')
      .eq('project_id', project_id)
      .not('status', 'in', '("complete","failed")')
      .limit(1)
      .maybeSingle()
 
    if (activeScan) {
       return res.status(409).json({ 
         success: false, 
         error: "A scan is already in progress for this project. Please wait for it to finish." 
       })
    }
 
    // 3. Create Scan record
    const { data: scan, error: scanErr } = await supabase
      .from('scans')
      .insert({
         project_id,
         user_id: req.user!.id,
         status: 'queued',
         overall_score: null,
         issue_count: 0,
         public_token: uuidv4()
      })
      .select()
      .single()

    if (scanErr) throw scanErr

    // 3. Start Orchestrator (Async)
    const orchestrator = new ScanOrchestrator(scan.id, project.url, req.user!.id, config)
    orchestrator.run() // Do NOT await here

    return res.json({ success: true, data: { scanId: scan.id } })

  } catch (err: any) {
    console.error("Error creating scan:", err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// GET Scan Status/Details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { data: scan, error } = await supabase
    .from('scans')
    .select(`
      *,
      pages (*),
      issues (*),
      scan_events (*),
      scan_scores (*),
      projects (name, url)
    `)
    .eq('id', req.params.id)
    .order('created_at', { foreignTable: 'scan_events', ascending: true })
    .single()

  if (error || !scan) return res.status(404).json({ success: false, error: "Scan not found" })

  return res.json({ success: true, data: scan })
})

const TERMINAL_SCAN_STATUSES = ['complete', 'failed', 'completed_with_errors'] as const

// SSE Endpoint for Live Events (use ?access_token= from EventSource — no Auth header support in browsers)
router.get('/:id/events', async (req: AuthenticatedRequest, res: Response) => {
  const scanId = req.params.id

  const { data: scanAccess, error: accessErr } = await supabase
    .from('scans')
    .select('id, user_id, status')
    .eq('id', scanId)
    .maybeSingle()

  if (accessErr || !scanAccess || scanAccess.user_id !== req.user!.id) {
    return res.status(404).json({ success: false, error: 'Scan not found' })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  res.write('\n')

  let lastEventId: string | null = null

  const intervalId = setInterval(async () => {
    try {
      let query = supabase
        .from('scan_events')
        .select('*')
        .eq('scan_id', scanId)
        .order('created_at', { ascending: true })

      if (lastEventId) {
        query = query.filter('id', 'gt', lastEventId)
      }

      const { data: events, error: eventErr } = await query

      if (eventErr) throw eventErr

      if (events && events.length > 0) {
        events.forEach((event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          lastEventId = event.id
        })
      }

      const { data: scan, error: scanErr } = await supabase
        .from('scans')
        .select('status')
        .eq('id', scanId)
        .single()

      if (scanErr) throw scanErr

      if (TERMINAL_SCAN_STATUSES.includes(scan.status as (typeof TERMINAL_SCAN_STATUSES)[number])) {
        res.write('event: close\ndata: Scan finished\n\n')
        clearInterval(intervalId)
        res.end()
      }
    } catch (err: any) {
      console.error('SSE Poll failed:', err.message)
      clearInterval(intervalId)
      res.end()
    }
  }, 1500)

  req.on('close', () => {
    clearInterval(intervalId)
  })
})

// GET List all scans for user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.query
    let query = supabase
      .from('scans')
      .select('*, projects(*)')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })

    if (projectId) {
       query = query.eq('project_id', projectId)
    }

    const { data: scans, error } = await query

    if (error) throw error
    return res.json({ success: true, data: scans })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/scans/:id/chat
router.post('/:id/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages } = req.body as { messages: Array<{ role: string; content: string }> }

    const { data: scan, error } = await supabase
      .from('scans')
      .select('project_id, scan_scores(*)')
      .eq('id', req.params.id)
      .single()

    if (error || !scan) return res.status(404).json({ success: false, error: 'Scan not found' })

    const { data: project } = await supabase.from('projects').select('url').eq('id', scan.project_id).single()
    const { data: issues } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', req.params.id)
      .order('severity', { ascending: true })
      .limit(15)

    const scores = (scan.scan_scores as any[])?.[0] || {}
    const context = {
      siteUrl: project?.url || 'Unknown',
      scores,
      topIssues: issues || [],
      aiSummary: scores.ai_summary || '',
    }

    const { aiEngine } = await import('../engine/ai-engine')
    const reply = await aiEngine.chat(messages as any, context)

    return res.json({ success: true, data: { message: reply } })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/scans/issues/:issueId/fix-code
router.post('/issues/:issueId/fix-code', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: issue, error } = await supabase
      .from('issues')
      .select('*')
      .eq('id', req.params.issueId)
      .single()

    if (error || !issue) return res.status(404).json({ success: false, error: 'Issue not found' })

    // Return cached fix if already generated
    if (issue.ai_fix_suggestion) {
      try {
        return res.json({ success: true, data: JSON.parse(issue.ai_fix_suggestion) })
      } catch {}
    }

    const { aiEngine } = await import('../engine/ai-engine')
    const fix = await aiEngine.generateFixCode(issue)

    await supabase.from('issues').update({ ai_fix_suggestion: JSON.stringify(fix) }).eq('id', req.params.issueId)

    return res.json({ success: true, data: fix })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE Scan
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)

    if (error) throw error
    return res.json({ success: true, data: null })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

export default router
