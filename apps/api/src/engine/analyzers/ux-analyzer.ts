import * as cheerio from 'cheerio';
import { Issue, PageRole } from 'types';
import { v4 as uuidv4 } from 'uuid';

export function analyze(page: { url: string; html: string }, role: PageRole): Issue[] {
  const issues: Issue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Buttons/links with empty or very short text (Deterministic)
  $('button, a').each((i, el) => {
     const text = $(el).text().trim();
     if (text.length < 2 && !$(el).attr('aria-label') && !$(el).attr('aria-labelledby')) {
        issues.push({
           category: 'ux',
           subcategory: 'empty_interactive',
           severity: 'medium',
           confidence: 1.0,
           detection_type: 'deterministic',
           scope: 'page',
           page_role: role,
           title: 'Undescriptive UI Element',
           description: `Found a link or button with too few characters (${text.length}). Users may find it hard to identify the target or action.`,
           id: uuidv4(),
           scan_id: '',
           page_id: '',
           created_at: new Date().toISOString()
        });
     }
  });

  // 2. Forms with no submit (Deterministic)
  $('form').each((i, el) => {
     const submit = $(el).find('button[type="submit"], input[type="submit"]');
     if (!submit.length) {
        issues.push({
           category: 'ux',
           subcategory: 'missing_submit',
           severity: 'medium',
           confidence: 1.0,
           detection_type: 'deterministic',
           scope: 'page',
           page_role: role,
           title: 'Form Missing Submit Button',
           description: 'The form on this page has no explicit submit button or identifier.',
           id: uuidv4(),
           scan_id: '',
           page_id: '',
           created_at: new Date().toISOString()
        });
     }
  });

  // 3. No Clear CTA (Heuristic - Homepage/Landing only)
  if (role === 'homepage' || role === 'landing_page') {
    const ctaLinks = $('a.btn, a.button, button:not([type="submit"]), a[href*="signup"], a[href*="get-started"], a[href*="contact"]');
    if (!ctaLinks.length) {
       issues.push({
          category: 'ux',
          subcategory: 'no_cta',
          severity: 'medium',
          confidence: 0.6,
          detection_type: 'heuristic',
          scope: 'page',
          page_role: role,
          title: 'No Clear Call-to-Action (CTA)',
          description: 'The primary entry page lacks recognizable call-to-action buttons. This may significantly hinder user conversion.',
          id: uuidv4(),
          scan_id: '',
          page_id: '',
          created_at: new Date().toISOString()
       });
    }
  }

  // 4. Navigation Clutter (Heuristic)
  const links = $('a');
  if (links.length > 50 && role !== 'blog_article' && role !== 'docs_page') {
     issues.push({
        category: 'ux',
        subcategory: 'nav_clutter',
        severity: 'low',
        confidence: 0.5,
        detection_type: 'heuristic',
        scope: 'page',
        page_role: role,
        title: 'High Navigation Density',
        description: `Found ${links.length} links on this page. Excessive navigation options can lead to "choice paralysis" and clutter the mobile experience.`,
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  return issues;
}
