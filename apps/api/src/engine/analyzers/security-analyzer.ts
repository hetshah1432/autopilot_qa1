import * as cheerio from 'cheerio';
import { Issue, PageRole } from 'types';
import { v4 as uuidv4 } from 'uuid';

export function analyze(page: { url: string; html: string; headers: Record<string, string> }, role: PageRole): Issue[] {
  const issues: Issue[] = [];
  const $ = cheerio.load(page.html);

  // 1. HTTPS check
  if (!page.url.startsWith('https://')) {
    issues.push({
      category: 'security',
      subcategory: 'https',
      severity: 'critical',
      confidence: 1.0,
      detection_type: 'deterministic',
      scope: 'sitewide', // If the start URL is HTTP, the whole site usually is
      page_role: role,
      title: 'Insecure URL Found',
      description: `Page at ${page.url} is not serving content over HTTPS. This exposes user data to man-in-the-middle attacks.`,
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  }

  // 2. Security Headers (Deterministic & Sitewide)
  const checkHeader = (header: string, name: string) => {
     const h = Object.keys(page.headers).find(k => k.toLowerCase() === header.toLowerCase());
     if (!h) {
        issues.push({
          category: 'security',
          subcategory: `header_${header.toLowerCase().replace(/-/g, '_')}`,
          severity: 'medium',
          confidence: 1.0,
          detection_type: 'deterministic',
          scope: 'sitewide',
          page_role: role,
          title: `Missing ${name} Header`,
          description: `The ${header} security header is not present. This protects against various attacks including ${name === 'CSP' ? 'XSS' : 'Clickjacking'}.`,
          id: uuidv4(),
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

  // 3. Tabnapping (Deterministic)
  $('a[target="_blank"]').each((i, el) => {
     const rel = $(el).attr('rel') || '';
     if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
        issues.push({
           category: 'security',
           subcategory: 'tabnapping',
           severity: 'medium',
           confidence: 1.0,
           detection_type: 'deterministic',
           scope: 'page',
           page_role: role,
           title: 'Insecure External Link (Tabnapping Risk)',
           description: 'Links with target="_blank" should include rel="noopener" or rel="noreferrer" to prevent the new page from accessing your site via window.opener.',
           evidence: `Found in link: ${$(el).attr('href')}`,
           id: uuidv4(),
           scan_id: '',
           page_id: '',
           created_at: new Date().toISOString()
        });
     }
  });

  // 4. Exposed Comments (Heuristic - Low Priority)
  const html = page.html.toLowerCase();
  const sensitiveKeywords = ['todo', 'fixme', 'api_key', 'password', 'secret', 'config'];
  const foundKeywords = sensitiveKeywords.filter(k => html.includes(`<!-- ${k}`) || html.includes(`/* ${k}`));
  
  if (foundKeywords.length > 0) {
     issues.push({
        category: 'security',
        subcategory: 'sensitive_comments',
        severity: 'low',
        confidence: 0.4,
        detection_type: 'heuristic',
        scope: 'page',
        page_role: role,
        title: 'Sensitive Keywords in Code Comments',
        description: `Found potentially sensitive keywords in comments: ${foundKeywords.join(', ')}. While often harmless, ensure these do not leak internal logic or credentials.`,
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  return issues;
}
