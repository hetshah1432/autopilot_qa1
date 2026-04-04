import { Issue } from 'types';
import { v4 as uuidv4 } from 'uuid';

interface LinkData {
   source: string;
   target: string;
   status?: number;
   is_external: boolean;
}

export function analyze(links: LinkData[]): Issue[] {
  const issues: Issue[] = [];

  links.forEach(link => {
    if (link.status && link.status >= 400) {
      const severity = link.status >= 500 ? 'critical' : (link.is_external ? 'high' : 'critical');
      issues.push({
        category: 'broken_links',
        subcategory: link.is_external ? 'external_link' : 'internal_link',
        severity: severity,
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        title: `Broken ${link.is_external ? 'External' : 'Internal'} Link`,
        description: `Link from ${link.source} to ${link.target} returned status ${link.status}.`,
        evidence: `Source: ${link.source} | Target: ${link.target} | HTTP ${link.status}`,
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
      });
    } else if (link.status && link.status >= 300 && link.status < 400) {
       issues.push({
          category: 'broken_links',
          subcategory: 'redirect',
          severity: 'info',
          confidence: 1.0,
          detection_type: 'deterministic',
          scope: 'page',
          title: 'Link Redirection',
          description: `Link from ${link.source} to ${link.target} returns ${link.status}. Consider linking directly to the destination to improve performance.`,
          id: uuidv4(),
          scan_id: '',
          page_id: '',
          created_at: new Date().toISOString()
       });
    }
  });

  return issues;
}
