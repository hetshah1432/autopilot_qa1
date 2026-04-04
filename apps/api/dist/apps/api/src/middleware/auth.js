"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const supabase_1 = require("../lib/supabase");
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }
        // Verify token using Supabase Auth
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: error?.message || 'Invalid token' });
        }
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email
        };
        next();
    }
    catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};
exports.requireAuth = requireAuth;
