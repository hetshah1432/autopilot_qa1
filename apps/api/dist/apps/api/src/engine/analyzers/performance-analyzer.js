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
    // Response Time
    if (page.response_time_ms > 3000) {
        issues.push({
            category: 'performance',
            severity: 'critical',
            title: 'Very Slow Server Response',
            description: `The page took ${page.response_time_ms}ms to load. Google recommends a server response time of under 200ms for best performance.`,
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    else if (page.response_time_ms > 1500) {
        issues.push({
            category: 'performance',
            severity: 'high',
            title: 'Slow Server Response',
            description: `The page took ${page.response_time_ms}ms to respond. This can lead to increased abandonment and poorer search engine rankings.`,
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Scripts
    const scripts = $('script');
    if (scripts.length > 10) {
        issues.push({
            category: 'performance',
            severity: 'medium',
            title: 'Too Many Scripts',
            description: `Found ${scripts.length} <script> tags. Each script increases the page's execution time and can affect interactivity.`,
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Stylesheets
    const styles = $('link[rel="stylesheet"]');
    if (styles.length > 5) {
        issues.push({
            category: 'performance',
            severity: 'low',
            title: 'Multiple Stylesheets Found',
            description: `Your page is loading ${styles.length} external stylesheets. Consider bundling these to reduce HTTP requests.`,
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Render blocking fonts
    const fonts = $('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
    if (fonts.length > 0 && !fonts.attr('media')?.includes('print')) {
        issues.push({
            category: 'performance',
            severity: 'low',
            title: 'Render-Blocking Google Fonts',
            description: 'Found synchronously loaded Google Fonts. Use font-display: swap in CSS to ensure text remains visible while fonts are loading.',
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Huge Inline Scripts
    $('script').each((i, el) => {
        if (!$(el).attr('src') && $(el).html().length > 5000) {
            issues.push({
                category: 'performance',
                severity: 'medium',
                title: 'Large Inline Script Detected',
                description: 'Large blocks of inline JavaScript increase the initial HTML size and delay the start of parsing.',
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Lazy Loading
    $('img').each((i, el) => {
        if (!$(el).attr('loading')) {
            issues.push({
                category: 'performance',
                severity: 'low',
                title: 'Missing Image Lazy Loading',
                description: `Image at ${$(el).attr('src')} does not enable the "loading" attribute. Use loading="lazy" for all non-LCP images.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    return issues;
}
