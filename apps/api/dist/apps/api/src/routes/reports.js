"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// GET /api/reports/public/:token — no auth required
router.get('/public/:token', async (req, res) => {
    const { data: scan, error } = await supabase_1.supabase
        .from('scans')
        .select(`
      *,
      pages (*),
      issues (*),
      scan_scores (*),
      projects (name, url)
    `)
        .eq('public_token', req.params.token)
        .eq('status', 'complete')
        .single();
    if (error || !scan) {
        return res.status(404).json({ success: false, error: 'Report not found' });
    }
    return res.json({ success: true, data: scan });
});
exports.default = router;
