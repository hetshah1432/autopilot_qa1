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
const uuid_1 = require("uuid");
function analyze(page) {
    const issues = [];
    const $ = cheerio.load(page.html);
    // Title
    const title = $('title').text().trim();
    if (!title) {
        issues.push({
            category: 'seo',
            severity: 'high',
            title: 'Missing Title Tag',
            description: 'Your page is missing a <title> tag, which is essential for search engines to understand your content.',
        });
    }
    else {
        if (title.length < 30) {
            issues.push({
                category: 'seo',
                severity: 'low',
                title: 'Title Tag Too Short',
                description: `Your title tag (${title.length} chars) is shorter than the recommended 30 characters.`,
            });
        }
        if (title.length > 60) {
            issues.push({
                category: 'seo',
                severity: 'medium',
                title: 'Title Tag Too Long',
                description: `Your title tag (${title.length} chars) exceeds the recommended 60 characters and may be truncated in search results.`,
            });
        }
    }
    // Meta Description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (!metaDesc) {
        issues.push({
            category: 'seo',
            severity: 'medium',
            title: 'Missing Meta Description',
            description: 'A meta description helps search engines summarize your page content for searchers.',
        });
    }
    // H1 Tags
    const h1s = $('h1');
    if (h1s.length === 0) {
        issues.push({
            category: 'seo',
            severity: 'high',
            title: 'Missing H1 Tag',
            description: 'Every page should have exactly one H1 tag to define the primary subject.',
        });
    }
    else if (h1s.length > 1) {
        issues.push({
            category: 'seo',
            severity: 'medium',
            title: 'Multiple H1 Tags Found',
            description: `Your page has ${h1s.length} H1 tags. Using more than one H1 can confuse search engines.`,
        });
    }
    // Canonical
    if (!$('link[rel="canonical"]').attr('href')) {
        issues.push({
            category: 'seo',
            severity: 'low',
            title: 'Missing Canonical Tag',
            description: 'A canonical tag helps prevent duplicate content issues by telling search engines which version of a URL is the master.',
        });
    }
    // Heading Hierarchy
    const headings = $('h1, h2, h3, h4, h5, h6');
    headings.each((i, el) => {
        if (i > 0) {
            const prevLevel = parseInt(headings.get(i - 1)?.tagName.substring(1) || '1');
            const currLevel = parseInt(el.tagName.substring(1));
            if (currLevel > prevLevel + 1) {
                issues.push({
                    category: 'seo',
                    severity: 'low',
                    title: 'Skipped Heading Level',
                    description: `Heading hierarchy skipped from H${prevLevel} to H${currLevel}. This can negatively affect accessibility and SEO.`,
                });
            }
        }
    });
    // Images without Alt
    $('img').each((i, el) => {
        if (!$(el).attr('alt')) {
            issues.push({
                category: 'seo',
                severity: 'medium',
                title: 'Image Missing Alt Text',
                description: `Image found at ${$(el).attr('src')} is missing an "alt" attribute, which is used by search engines to understand image context.`,
            });
        }
    });
    // Open Graph
    if (!$('meta[property="og:title"]').attr('content')) {
        issues.push({
            category: 'seo',
            severity: 'low',
            title: 'Missing Open Graph Tags',
            description: 'Complete Open Graph metrics help ensure your links look professional when shared on social platforms.',
        });
    }
    return issues.map((i) => ({
        ...i,
        category: 'seo',
        scan_id: '',
        page_id: '',
        id: (0, uuid_1.v4)(),
        created_at: new Date().toISOString()
    }));
}
