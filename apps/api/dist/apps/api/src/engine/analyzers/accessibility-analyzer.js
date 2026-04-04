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
    // Images missing alt attribute
    $('img').each((i, el) => {
        if (!$(el).attr('alt')) {
            issues.push({
                category: 'accessibility',
                severity: 'high',
                title: 'Image Missing Alt Text',
                description: `Image at ${$(el).attr('src')} is inaccessible for screen readers. All images must have an "alt" attribute, even if empty for decorative icons.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Forms missing labels
    $('input, textarea, select').each((i, el) => {
        const id = $(el).attr('id');
        const label = $(`label[for="${id}"]`);
        if (!label.length && !$(el).attr('aria-label') && !$(el).attr('aria-labelledby') && $(el).attr('type') !== 'hidden' && $(el).attr('type') !== 'submit') {
            issues.push({
                category: 'accessibility',
                severity: 'high',
                title: 'Form Input Missing Label',
                description: `An input field has no corresponding label element or aria-label, which makes it difficult for screen readers users to understand its purpose.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Buttons without text
    $('button').each((i, el) => {
        if (!$(el).text().trim() && !$(el).attr('aria-label') && !$(el).attr('aria-labelledby')) {
            issues.push({
                category: 'accessibility',
                severity: 'medium',
                title: 'Empty Button Detected',
                description: `A button element has no text or ARIA label. Screen readers will not be able to announce the action to the user.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Language attribute
    if (!$('html').attr('lang')) {
        issues.push({
            category: 'accessibility',
            severity: 'medium',
            title: 'Missing Page Language',
            description: 'The root <html> element is missing a "lang" attribute, which screen readers use to determine the correct pronunciation and accent.',
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    // Generic link text
    $('a').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        const genericWords = ['click here', 'read more', 'learn more', 'go', 'link'];
        if (genericWords.some(word => text === word)) {
            issues.push({
                category: 'accessibility',
                severity: 'low',
                title: 'Generic Link Text',
                description: `A link with the text "${text}" was found. Links should be descriptive enough that they make sense out of context.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    // Basic skip nav check
    const firstLink = $('a').first();
    if (!firstLink.length || !firstLink.attr('href')?.startsWith('#')) {
        issues.push({
            category: 'accessibility',
            severity: 'low',
            title: 'Missing Skip Navigation Link',
            description: 'Provide a link that allows keyboard users to bypass blocks of content (like global navigation) that are repeated on multiple pages.',
            id: crypto.randomUUID(),
            scan_id: '',
            page_id: '',
            created_at: new Date().toISOString()
        });
    }
    return issues;
}
