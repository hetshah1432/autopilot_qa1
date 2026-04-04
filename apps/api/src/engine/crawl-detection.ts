import { CrawlStatus } from 'types';
import axios from 'axios';
import { URL } from 'url';

export interface DetectionResult {
  status: CrawlStatus;
  isBlocked: boolean;
  reason?: string;
}

/**
 * Detects the crawl status based on HTTP signals and HTML markers.
 * This is an honest detection layer, not a bypass heuristic.
 */
export function detectCrawlStatus(
  html: string,
  statusCode: number,
  headers: Record<string, string>,
  url: string
): DetectionResult {
  const lowercaseHtml = html.toLowerCase();
  
  // 1. Explicit Status Codes
  if (statusCode === 429) {
    return { status: 'rate_limited', isBlocked: true, reason: 'Rate limit (429) hit.' };
  }
  
  if (statusCode === 403) {
    // Check if it's a generic 403 or a known WAF 403
    if (headers['server']?.toLowerCase().includes('cloudflare')) {
      return { status: 'blocked_waf', isBlocked: true, reason: 'Cloudflare access denied (403).' };
    }
    return { status: 'blocked_waf', isBlocked: true, reason: 'Access denied (403).' };
  }
  
  if (statusCode === 503) {
     if (lowercaseHtml.includes('just a moment') || lowercaseHtml.includes('checking your browser')) {
       return { status: 'blocked_js_challenge', isBlocked: true, reason: 'JS Challenge (Cloudflare/DDoS protection).' };
     }
  }

  // 2. HTML Markers for Anti-Bot / WAF
  const blockMarkers = [
    { text: 'captcha', status: 'blocked_captcha' as CrawlStatus, reason: 'CAPTCHA challenge detected.' },
    { text: 'verify you are human', status: 'blocked_captcha' as CrawlStatus, reason: 'Human verification required.' },
    { text: 'hcaptcha', status: 'blocked_captcha' as CrawlStatus, reason: 'hCaptcha challenge detected.' },
    { text: 'bot protection', status: 'blocked_waf' as CrawlStatus, reason: 'Bot protection detected.' },
    { text: 'access denied', status: 'blocked_waf' as CrawlStatus, reason: 'Access denied page.' },
    { text: 'datadome', status: 'blocked_waf' as CrawlStatus, reason: 'DataDome protection detected.' },
    { text: 'akamai', status: 'blocked_waf' as CrawlStatus, reason: 'Akamai protection detected.' },
    { text: 'attention required! | cloudflare', status: 'blocked_waf' as CrawlStatus, reason: 'Cloudflare block page.' }
  ];

  for (const marker of blockMarkers) {
    if (lowercaseHtml.includes(marker.text)) {
      return { status: marker.status, isBlocked: true, reason: marker.reason };
    }
  }

  // 3. Login Walls
  if (lowercaseHtml.split('<input').length > 3 && (lowercaseHtml.includes('password') || lowercaseHtml.includes('login') || lowercaseHtml.includes('sign in'))) {
    // If we logic in the root but expect content, it's likely a login wall
    return { status: 'login_required', isBlocked: true, reason: 'Login wall detected.' };
  }

  // 4. Empty / Minimal Content
  if (html.trim().length < 200 && statusCode >= 200 && statusCode < 300) {
    return { status: 'partial_content', isBlocked: true, reason: 'Empty or suspicious minimal response.' };
  }

  return { status: 'success', isBlocked: false };
}

/**
 * Fetches and parses robots.txt for a given domain to check path restrictions.
 */
export async function getRobotsRestrictions(targetUrl: string): Promise<string[]> {
  try {
    const parsedUrl = new URL(targetUrl);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
    
    const response = await axios.get(robotsUrl, { timeout: 5000, validateStatus: () => true });
    if (response.status !== 200) return [];

    const lines = (response.data as string).split('\n');
    const disallowedPaths: string[] = [];
    let isUserAgentWildcard = false;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('user-agent: *')) {
        isUserAgentWildcard = true;
      } else if (trimmed.startsWith('user-agent:')) {
        isUserAgentWildcard = false;
      }

      if (isUserAgentWildcard && trimmed.startsWith('disallow:')) {
        const path = line.split(':')[1]?.trim();
        if (path) disallowedPaths.push(path);
      }
    }

    return disallowedPaths;
  } catch (err) {
    return [];
  }
}

/**
 * Checks if a specific URL path is disallowed by a list of robots.txt paths.
 */
export function isPathDisallowed(path: string, disallowedPaths: string[]): boolean {
  return disallowedPaths.some(disallowed => {
    if (disallowed === '/') return true;
    if (disallowed.endsWith('*')) {
      return path.startsWith(disallowed.slice(0, -1));
    }
    return path.startsWith(disallowed);
  });
}
