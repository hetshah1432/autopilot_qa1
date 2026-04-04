import * as cheerio from 'cheerio';
import { PageRole } from 'types';

export function classifyPage(url: string, html: string): PageRole {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    const $ = cheerio.load(html);
    const title = $('title').text().toLowerCase();
    const bodyText = $('body').text().toLowerCase().slice(0, 1000);

    // 1. Homepage
    if (path === '/' || path === '/index.html' || path === '/home') {
      return 'homepage';
    }

    // 2. Docs / Documentation
    if (path.includes('/docs') || path.includes('/documentation') || title.includes('docs') || title.includes('documentation')) {
      return 'docs_page';
    }

    // 3. Contact / Support
    if (path.includes('/contact') || path.includes('/support') || title.includes('contact') || title.includes('support')) {
      return 'contact_page';
    }

    // 4. Products / Projects / Items (e.g. /product/123, /project/abc)
    if (path.includes('/product') || path.includes('/project') || path.includes('/item') || url.includes('id=')) {
      // If it has a long alphanumeric or numeric ID, it's a detail page
      const segments = path.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (segments.length >= 2 || lastSegment?.length > 5 || /^\d+$/.test(lastSegment)) {
        return 'product_detail';
      }
    }

    // 5. Blog / Article
    if (path.includes('/blog') || path.includes('/article') || path.includes('/post') || $('article').length > 0) {
      return 'blog_article';
    }

    // 6. Landing Pages (features, pricing, about)
    const landingKeywords = ['feature', 'pricing', 'about', 'service', 'demo', 'signup', 'register'];
    if (landingKeywords.some(k => path.includes(k) || title.includes(k))) {
      return 'landing_page';
    }

    // Default to unknown if truly ambiguous, but usually it's just generic
    return 'generic_internal';
  } catch (e) {
    return 'unknown';
  }
}
