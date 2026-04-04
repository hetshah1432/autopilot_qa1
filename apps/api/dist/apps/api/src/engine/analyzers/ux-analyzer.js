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
    // Buttons/links with empty or very short text
    $('button, a').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length < 2 && !$(el).attr('aria-label') && !$(el).attr('aria-labelledby')) {
            issues.push({
                category: 'ux',
                severity: 'medium',
                title: 'Undescriptive UI Element',
                description: `Found a link or button with too few characters (${text.length}). Users may find it hard to identify the target or action.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Multiple H1 tags (confusing UI hierarchy)
    const h1Count = $('h1').length;
    if (h1Count > 1) {
        issues.push({
            category: 'ux',
            severity: 'low',
            title: 'Confusing Heading Structure',
            description: `Page has ${h1Count} H1 tags, which can confuse users and search engines about the primary content of the page.`,
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Forms with no submit
    $('form').each((i, el) => {
        const submit = $(el).find('button[type="submit"], input[type="submit"]');
        if (!submit.length) {
            issues.push({
                category: 'ux',
                severity: 'medium',
                title: 'Form Missing Submit Button',
                description: 'The form on this page has no explicit submit button. This can be inaccessible and confusing for some users.',
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Very long paragraphs
    $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 2500) { // approx 500 words
            issues.push({
                category: 'ux',
                severity: 'low',
                title: 'Excessively Long Paragraph',
                description: 'Found a paragraph longer than 500 words. Consider breaking it up into smaller, more readable segments.',
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Favicon check
    const favicon = $('link[rel*="icon"]');
    if (!favicon.length) {
        issues.push({
            category: 'ux',
            severity: 'low',
            title: 'Missing Favicon',
            description: 'No favicon detected. A favicon helps users identify your tab and builds trust.',
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Footer check
    const footer = $('footer');
    if (!footer.length) {
        issues.push({
            category: 'ux',
            severity: 'low',
            title: 'Missing Standard Footer',
            description: 'A footer provides context and consistent navigation for users. Consider adding one.',
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // AI FLAG: no clear CTA
    const ctaLinks = $('a.btn, a.button, button:not([type="submit"]), a[href*="signup"], a[href*="contact"]');
    if (!ctaLinks.length) {
        issues.push({
            category: 'ux',
            severity: 'low',
            title: 'AI_FLAG: No Clear CTA Detected',
            description: 'The page lacks recognizable call-to-action buttons. This may hinder conversion rates.',
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    return issues;
}
