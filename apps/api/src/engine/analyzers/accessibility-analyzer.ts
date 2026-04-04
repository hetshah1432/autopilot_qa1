import * as cheerio from 'cheerio';
import { Issue, PageRole } from 'types';
import { v4 as uuidv4 } from 'uuid';

export function analyze(page: { url: string; html: string }, role: PageRole): Issue[] {
  const issues: Issue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Images missing alt (Deterministic)
  $('img').each((i, el) => {
    if (!$(el).attr('alt')) {
       issues.push({
          category: 'accessibility',
          subcategory: 'alt_text',
          severity: 'high',
          confidence: 1.0,
          detection_type: 'deterministic',
          scope: 'page',
          page_role: role,
          title: 'Image Missing Alt Text',
          description: `Image at ${$(el).attr('src')} is inaccessible for screen readers. All images must have an "alt" attribute.`,
          id: uuidv4(),
          scan_id: '',
          page_id: '',
          created_at: new Date().toISOString()
       });
    }
  });

  // 2. Forms missing labels (Deterministic)
  $('input, textarea, select').each((i, el) => {
     const id = $(el).attr('id');
     const label = id ? $(`label[for="${id}"]`) : [];
     if (!label.length && !$(el).attr('aria-label') && !$(el).attr('aria-labelledby') && $(el).attr('type') !== 'hidden' && $(el).attr('type') !== 'submit') {
        issues.push({
           category: 'accessibility',
           subcategory: 'form_label',
           severity: 'high',
           confidence: 1.0,
           detection_type: 'deterministic',
           scope: 'page',
           page_role: role,
           title: 'Form Input Missing Label',
           description: `An input field has no corresponding label element or aria-label.`,
           id: uuidv4(),
           scan_id: '',
           page_id: '',
           created_at: new Date().toISOString()
        });
     }
  });

  // 3. Semantic Landmarks (Deterministic)
  const landmarks = ['header', 'nav', 'main', 'footer'];
  landmarks.forEach(tag => {
     if ($(tag).length === 0) {
        issues.push({
           category: 'accessibility',
           subcategory: 'landmarks',
           severity: role === 'homepage' || role === 'landing_page' ? 'medium' : 'low',
           confidence: 1.0,
           detection_type: 'deterministic',
           scope: 'page',
           page_role: role,
           title: `Missing Semantic <${tag}> Landmark`,
           description: `Modern web layouts should use semantic HTML5 elements like <${tag}> to help users with assistive technologies navigate the page.`,
           id: uuidv4(),
           scan_id: '',
           page_id: '',
           created_at: new Date().toISOString()
        });
     }
  });

  // 4. Empty Headings (Deterministic)
  $('h1, h2, h3, h4, h5, h6').each((i, el) => {
     if (!$(el).text().trim()) {
        issues.push({
           category: 'accessibility',
           subcategory: 'empty_heading',
           severity: 'low',
           confidence: 1.0,
           detection_type: 'deterministic',
           scope: 'page',
           page_role: role,
           title: 'Empty Heading Found',
           description: 'Empty headings provide no value to users and can be confusing when navigating via keyboard or screen reader.',
           id: uuidv4(),
           scan_id: '',
           page_id: '',
           created_at: new Date().toISOString()
        });
     }
  });

  return issues;
}
