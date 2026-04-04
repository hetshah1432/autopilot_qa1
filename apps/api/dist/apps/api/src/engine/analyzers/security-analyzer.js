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
exports.analyze = analyze;
const cheerio = __importStar(require("cheerio"));
function analyze(page) {
    const issues = [];
    const $ = cheerio.load(page.html);
    // HTTPS check
    if (!page.url.startsWith('https://')) {
        issues.push({
            category: 'security',
            severity: 'critical',
            title: 'Insecure URL Found',
            description: `Page at ${page.url} is not serving content over HTTPS. This exposes user data to man-in-the-middle attacks.`,
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Security Headers
    const checkHeader = (header, name) => {
        const h = Object.keys(page.headers).find(k => k.toLowerCase() === header.toLowerCase());
        if (!h) {
            issues.push({
                category: 'security',
                severity: 'medium',
                title: `Missing ${name} Header`,
                description: `The ${header} security header is not present. This header protects against various attacks including ${name === 'CSP' ? 'XSS' : 'Clickjacking'}.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    };
    checkHeader('Content-Security-Policy', 'CSP');
    checkHeader('X-Frame-Options', 'Clickjacking Protection');
    checkHeader('X-Content-Type-Options', 'MIME Sniffing Protection');
    checkHeader('Strict-Transport-Security', 'HSTS');
    checkHeader('Referrer-Policy', 'Referrer Leak Mitigation');
    // Mixed Content
    $('img, script, link').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('href');
        if (src && src.startsWith('http://') && page.url.startsWith('https://')) {
            issues.push({
                category: 'security',
                severity: 'critical',
                title: 'Mixed Content Detected',
                description: `The HTTPS page is loading an insecure asset from ${src}, which will cause browsers to display a warning.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Sensitive paths in links
    const sensitivePaths = ['.env', '.git', 'admin', 'wp-admin', 'config.php'];
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && sensitivePaths.some(p => href.includes(p))) {
            issues.push({
                category: 'security',
                severity: 'high',
                title: 'Exposed Sensitive Paths',
                description: `Website links found that appear to lead to a sensitive path or directory: ${href}. Review these to ensure no private information is exposed.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    return issues;
}
