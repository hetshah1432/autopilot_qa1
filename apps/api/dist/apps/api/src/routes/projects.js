"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const ProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Project name is required"),
    url: zod_1.z.string().url("Invalid website URL"),
    description: zod_1.z.string().optional()
});
// List projects
router.get('/', async (req, res) => {
    const { data, error } = await supabase_1.supabase
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
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data });
});
// Create project
router.post('/', async (req, res) => {
    try {
        const validated = ProjectSchema.parse(req.body);
        // Validate URL accessibility
        try {
            // Some sites block HEAD, so we use GET but only fetch a tiny part (if possible) 
            // or just check the status code
            await axios_1.default.get(validated.url, { timeout: 7000, validateStatus: (status) => status < 500 });
        }
        catch (err) {
            return res.status(400).json({ success: false, error: "Website URL is not accessible" });
        }
        const { data, error } = await supabase_1.supabase
            .from('projects')
            .insert({
            ...validated,
            user_id: req.user.id
        })
            .select()
            .single();
        if (error)
            return res.status(500).json({ success: false, error: error.message });
        return res.json({ success: true, data });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: err.errors[0].message });
        }
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});
// Get single project
router.get('/:id', async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('projects')
        .select(`
      *,
      scans (
        *,
        scan_scores (*)
      )
    `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    if (error)
        return res.status(404).json({ success: false, error: "Project not found" });
    return res.json({ success: true, data });
});
// Update project
router.patch('/:id', async (req, res) => {
    const validated = ProjectSchema.partial().parse(req.body);
    const { data, error } = await supabase_1.supabase
        .from('projects')
        .update(validated)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data });
});
// Delete project
router.delete('/:id', async (req, res) => {
    const { error } = await supabase_1.supabase
        .from('projects')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data: null });
});
exports.default = router;
