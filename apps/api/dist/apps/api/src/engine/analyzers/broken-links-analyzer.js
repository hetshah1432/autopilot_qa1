"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = analyze;
function analyze(links) {
    const issues = [];
    links.forEach(link => {
        if (link.status && link.status >= 400) {
            const severity = link.status >= 500 ? 'critical' : (link.is_external ? 'high' : 'critical');
            issues.push({
                category: 'broken_links',
                severity: severity,
                title: `Broken ${link.is_external ? 'External' : 'Internal'} Link`,
                description: `Link from ${link.source} to ${link.target} returned ${link.status}.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
        else if (link.status && link.status >= 300 && link.status < 400) {
            issues.push({
                category: 'broken_links',
                severity: 'info',
                title: 'Link Redirection',
                description: `Direct users to the final destination to improve performance. Link from ${link.source} to ${link.target} returns ${link.status}.`,
                id: crypto.randomUUID(),
                scan_id: '',
                page_id: '',
                created_at: new Date().toISOString()
            });
        }
    });
    return issues;
}
