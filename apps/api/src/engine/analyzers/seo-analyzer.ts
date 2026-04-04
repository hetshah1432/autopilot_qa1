import * as cheerio from 'cheerio';
import { Issue, PageRole } from 'types';
import { v4 as uuidv4 } from 'uuid';

export function analyze(page: { url: string; html: string; status: number }, role: PageRole): Issue[] {
  const issues: Issue[] = [];
  const $ = cheerio.load(page.html);

  // Helper for role-based severity
  const getSeverity = (base: 'low' | 'medium' | 'high', thresholdRoles: PageRole[]) => {
     if (thresholdRoles.includes(role)) return base;
     if (base === 'high') return 'medium';
     if (base === 'medium') return 'low';
     return 'low';
  };

  // 1. Title Tag
  const title = $('title').text().trim();
  if (!title) {
    issues.push({
      category: 'seo',
      subcategory: 'title',
      severity: getSeverity('high', ['homepage', 'landing_page', 'blog_article']),
      confidence: 1.0,
      detection_type: 'deterministic',
      scope: 'page',
      page_role: role,
      title: 'Missing Title Tag',
      description: 'Your page is missing a <title> tag. This is the most important on-page SEO element.',
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  } else if (title.length < 20 || title.length > 70) {
     issues.push({
        category: 'seo',
        subcategory: 'title_length',
        severity: 'low',
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        page_role: role,
        title: 'Suboptimal Title Length',
        description: `Your title is ${title.length} characters long. Aim for 30-60 characters for optimal display in search results.`,
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  // 2. Meta Description
  const metaDesc = $('meta[name="description"]').attr('content');
  if (!metaDesc) {
    issues.push({
      category: 'seo',
      subcategory: 'meta_description',
      severity: getSeverity('medium', ['homepage', 'landing_page', 'blog_article', 'product_detail']),
      confidence: 1.0,
      detection_type: 'deterministic',
      scope: 'page',
      page_role: role,
      title: 'Missing Meta Description',
      description: 'A meta description helps search engines summarize your page content for searchers.',
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  }

  // 3. Viewport (Critical for Mobile)
  const viewport = $('meta[name="viewport"]').attr('content');
  if (!viewport) {
     issues.push({
        category: 'seo',
        subcategory: 'mobile_optimization',
        severity: 'high',
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        page_role: role,
        title: 'Missing Viewport Meta Tag',
        description: 'Without a viewport tag, mobile browsers will render your site as a desktop page, which is extremely poorly treated by modern search engines.',
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  // 4. HTML Language
  const lang = $('html').attr('lang');
  if (!lang) {
     issues.push({
        category: 'seo',
        subcategory: 'language_declaration',
        severity: 'low',
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        page_role: role,
        title: 'Missing HTML Language Attribute',
        description: 'Declaring a language helps search engines and screen readers serve the correct version of your content.',
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  // 5. H1 Analysis
  const h1s = $('h1');
  if (h1s.length === 0) {
    issues.push({
      category: 'seo',
      subcategory: 'heading_h1',
      severity: getSeverity('high', ['homepage', 'landing_page', 'blog_article']),
      confidence: 1.0,
      detection_type: 'deterministic',
      scope: 'page',
      page_role: role,
      title: 'Missing H1 Heading',
      description: 'Every page should have exactly one H1 tag to define the primary subject.',
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  } else if (h1s.length > 1) {
    issues.push({
      category: 'seo',
      subcategory: 'heading_h1_multiple',
      severity: 'medium',
      confidence: 1.0,
      detection_type: 'deterministic',
      scope: 'page',
      page_role: role,
      title: 'Multiple H1 Headings',
      description: 'Using more than one H1 can dilute the keyword focus and confuse search engines.',
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  }

  // 6. Social Graph (OG / Twitter)
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const twitterCard = $('meta[name="twitter:card"]').attr('content');
  if (!ogTitle || !twitterCard) {
    issues.push({
      category: 'seo',
      subcategory: 'social_graph',
      severity: getSeverity('medium', ['homepage', 'landing_page', 'blog_article']),
      confidence: 1.0,
      detection_type: 'deterministic',
      scope: 'page',
      page_role: role,
      title: 'Missing Social Preview Tags',
      description: 'Your page is missing OpenGraph or Twitter Card metadata. This affects how your site looks when shared on social media.',
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  }

  // 7. Canonical Tag
  const canonical = $('link[rel="canonical"]').attr('href');
  if (!canonical) {
     issues.push({
        category: 'seo',
        subcategory: 'canonical',
        severity: 'low',
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        page_role: role,
        title: 'Missing Canonical Link',
        description: 'Canonical tags help prevent duplicate content issues.',
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  return issues;
}
