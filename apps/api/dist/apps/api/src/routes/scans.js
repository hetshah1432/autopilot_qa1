"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const orchestrator_1 = require("../engine/orchestrator");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// POST Start Scan
router.post('/', async (req, res) => {
    const { project_id, config: providedConfig } = req.body;
    // Default Config fallback to prevent API crashes
    const config = providedConfig || {
        depth: 1,
        max_pages: 5,
        use_js: true,
        capture_screenshots: true,
        check_external: false
    };
    if (!project_id)
        return res.status(400).json({ success: false, error: "Project ID is required" });
    try {
        // 1. Validate project exists and user owns it
        const { data: project, error: projectErr } = await supabase_1.supabase
            .from('projects')
            .select('url')
            .eq('id', project_id)
            .eq('user_id', req.user.id)
            .single();
        if (projectErr || !project) {
            return res.status(404).json({ success: false, error: "Project not found" });
        }
        // 2. Create Scan record
        const { data: scan, error: scanErr } = await supabase_1.supabase
            .from('scans')
            .insert({
            project_id,
            user_id: req.user.id,
            status: 'queued',
            overall_score: null,
            issue_count: 0,
            public_token: (0, uuid_1.v4)()
        })
            .select()
            .single();
        if (scanErr)
            throw scanErr;
        // 3. Start Orchestrator (Async)
        const orchestrator = new orchestrator_1.ScanOrchestrator(scan.id, project.url, req.user.id, config);
        orchestrator.run(); // Do NOT await here
        return res.json({ success: true, data: { scanId: scan.id } });
    }
    catch (err) {
        console.error("Error creating scan:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET Scan Status/Details
router.get('/:id', async (req, res) => {
    const { data: scan, error } = await supabase_1.supabase
        .from('scans')
        .select(`
      *,
      pages (*),
      issues (*),
      scan_scores (*),
      projects (name, url)
    `)
        .eq('id', req.params.id)
        .single();
    if (error || !scan)
        return res.status(404).json({ success: false, error: "Scan not found" });
    return res.json({ success: true, data: scan });
});
// SSE Endpoint for Live Events
router.get('/:id/events', async (req, res) => {
    const scanId = req.params.id;
    // SSE Set headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    // Flush headers immediately
    res.write('\n');
    let lastEventId = null;
    const intervalId = setInterval(async () => {
        try {
            // 1. Fetch any new events since lastEventId or ALL if initial
            let query = supabase_1.supabase
                .from('scan_events')
                .select('*')
                .eq('scan_id', scanId)
                .order('created_at', { ascending: true });
            if (lastEventId) {
                query = query.filter('id', 'gt', lastEventId);
            }
            const { data: events, error: eventErr } = await query;
            if (eventErr)
                throw eventErr;
            if (events && events.length > 0) {
                events.forEach(event => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                    lastEventId = event.id;
                });
            }
            // 2. Check if scan is finished
            const { data: scan, error: scanErr } = await supabase_1.supabase
                .from('scans')
                .select('status')
                .eq('id', scanId)
                .single();
            if (scanErr)
                throw scanErr;
            if (['complete', 'failed'].includes(scan.status)) {
                res.write('event: close\ndata: Scan finished\n\n');
                clearInterval(intervalId);
                res.end();
            }
        }
        catch (err) {
            console.error("SSE Poll failed:", err.message);
            clearInterval(intervalId);
            res.end();
        }
    }, 1500);
    // Handle client disconnect
    req.on('close', () => {
        clearInterval(intervalId);
    });
});
// GET List all scans for user
router.get('/', async (req, res) => {
    try {
        const { projectId } = req.query;
        let query = supabase_1.supabase
            .from('scans')
            .select('*, projects(*)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (projectId) {
            query = query.eq('project_id', projectId);
        }
        const { data: scans, error } = await query;
        if (error)
            throw error;
        return res.json({ success: true, data: scans });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/scans/:id/chat
router.post('/:id/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const { data: scan, error } = await supabase_1.supabase
            .from('scans')
            .select('project_id, scan_scores(*)')
            .eq('id', req.params.id)
            .single();
        if (error || !scan)
            return res.status(404).json({ success: false, error: 'Scan not found' });
        const { data: project } = await supabase_1.supabase.from('projects').select('url').eq('id', scan.project_id).single();
        const { data: issues } = await supabase_1.supabase
            .from('issues')
            .select('*')
            .eq('scan_id', req.params.id)
            .order('severity', { ascending: true })
            .limit(15);
        const scores = scan.scan_scores?.[0] || {};
        const context = {
            siteUrl: project?.url || 'Unknown',
            scores,
            topIssues: issues || [],
            aiSummary: scores.ai_summary || '',
        };
        const { aiEngine } = await Promise.resolve().then(() => __importStar(require('../engine/ai-engine')));
        const reply = await aiEngine.chat(messages, context);
        return res.json({ success: true, data: { message: reply } });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/scans/issues/:issueId/fix-code
router.post('/issues/:issueId/fix-code', async (req, res) => {
    try {
        const { data: issue, error } = await supabase_1.supabase
            .from('issues')
            .select('*')
            .eq('id', req.params.issueId)
            .single();
        if (error || !issue)
            return res.status(404).json({ success: false, error: 'Issue not found' });
        // Return cached fix if already generated
        if (issue.ai_fix_suggestion) {
            try {
                return res.json({ success: true, data: JSON.parse(issue.ai_fix_suggestion) });
            }
            catch { }
        }
        const { aiEngine } = await Promise.resolve().then(() => __importStar(require('../engine/ai-engine')));
        const fix = await aiEngine.generateFixCode(issue);
        await supabase_1.supabase.from('issues').update({ ai_fix_suggestion: JSON.stringify(fix) }).eq('id', req.params.issueId);
        return res.json({ success: true, data: fix });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// DELETE Scan
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase_1.supabase
            .from('scans')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error)
            throw error;
        return res.json({ success: true, data: null });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
