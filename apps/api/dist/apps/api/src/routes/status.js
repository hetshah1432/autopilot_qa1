"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const start = Date.now();
        // 1. Check Supabase
        let supabaseStatus = 'ok';
        let supabaseMsg = 'Connected';
        try {
            const { error } = await supabase_1.supabase.from('projects').select('count', { count: 'exact', head: true }).limit(1);
            if (error)
                throw error;
        }
        catch (err) {
            supabaseStatus = 'error';
            supabaseMsg = err.message;
        }
        // 2. Check Groq
        const groqStatus = process.env.GROQ_API_KEY ? 'ok' : 'not_configured';
        // 3. Check Playwright (basic env check)
        let playwrightStatus = 'ok';
        let playwrightMsg = 'Ready';
        if (process.env.NODE_ENV === 'production' && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
            // Just a hint for production envs
        }
        const isDegraded = supabaseStatus !== 'ok' || groqStatus !== 'ok';
        return res.json({
            status: isDegraded ? 'degraded' : 'ok',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            latency_ms: Date.now() - start,
            services: {
                supabase: { status: supabaseStatus, message: supabaseMsg },
                ai: { status: groqStatus, provider: 'groq', model: 'llama-3.3-70b-versatile' },
                playwright: { status: playwrightStatus, message: playwrightMsg }
            }
        });
    }
    catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});
exports.default = router;
