import { chromium, Browser, Page as PWPage } from 'playwright';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import * as https from 'https';
import { CrawlStatus } from 'types';
import { detectCrawlStatus, getRobotsRestrictions, isPathDisallowed } from './crawl-detection';

export interface ScanConfig {
  depth: number;
  max_pages: number;
  use_js: boolean;
  capture_screenshots: boolean;
  check_external: boolean;
}

export interface PageData {
  url: string;
  html: string;
  status: number;
  headers: Record<string, string>;
  response_time_ms: number;
  screenshot_path?: string;
  crawl_status: CrawlStatus;
  blocked: boolean;
  block_reason?: string;
}

export interface LinkData {
  source: string;
  target: string;
  status?: number;
  is_external: boolean;
}

export interface CrawlSummary {
  totalPagesDiscovered: number;
  totalPagesAnalyzed: number;
  blockedPages: number;
  robotsSkippedPages: number;
  partialPages: number;
  reportMode: 'full' | 'partial' | 'protected_site_limited';
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class CrawlEngine {
  private visited: Set<string> = new Set();
  private queue: { url: string; depth: number }[] = [];
  private results: PageData[] = [];
  private allLinks: LinkData[] = [];
  private browser: Browser | null = null;
  private disallowedPaths: string[] = [];
  private discoveredCount = 0;

  constructor(private startUrl: string, private config: ScanConfig = {
    depth: 1,
    max_pages: 25,
    use_js: true,
    capture_screenshots: true,
    check_external: false
  }) {
    this.queue.push({ url: startUrl, depth: 0 });
  }

  async start(onProgress: (msg: string) => void) {
    try {
      onProgress('Checking robots.txt for crawl permissions...');
      this.disallowedPaths = await getRobotsRestrictions(this.startUrl);
    } catch (e) {
      console.warn('[CrawlEngine] Failed to fetch robots.txt, proceeding with caution.');
    }

    if (this.config.use_js) {
      try {
        this.browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      } catch (err: any) {
        onProgress(`Browser engine unavailable: Falling back to static scanning mode.`);
        this.config.use_js = false;
      }
    }

    try {
      const domain = new URL(this.startUrl).hostname;

      while (this.queue.length > 0 && this.results.length < this.config.max_pages) {
        const current = this.queue.shift()!;
        if (this.visited.has(current.url)) continue;
        this.visited.add(current.url);

        const path = new URL(current.url).pathname;
        if (isPathDisallowed(path, this.disallowedPaths)) {
          onProgress(`Skipping robots-disallowed path: ${current.url}`);
          this.results.push({
            url: current.url,
            html: '',
            status: 403,
            headers: {},
            response_time_ms: 0,
            crawl_status: 'robots_disallowed',
            blocked: true,
            block_reason: 'Disallowed by robots.txt'
          });
          continue;
        }

        onProgress(`Crawling ${this.results.length + 1}/${this.config.max_pages} — ${current.url}`);

        if (this.results.length > 0) {
          await sleep(500 + Math.random() * 1000);
        }

        try {
          const pageData = await this.fetchPage(current.url);
          this.results.push(pageData);

          if (!pageData.blocked && current.depth < this.config.depth) {
            const links = this.extractLinks(pageData.html, current.url);
            this.discoveredCount += links.length;
            
            links.forEach(link => {
              const isExternal = new URL(link, current.url).hostname !== domain;

              this.allLinks.push({
                source: current.url,
                target: link,
                is_external: isExternal
              });

              if (!isExternal && !this.visited.has(link) && this.results.length < this.config.max_pages) {
                this.queue.push({ url: link, depth: current.depth + 1 });
              }
            });
          }
        } catch (err: any) {
          console.error(`Error crawling ${current.url}:`, err.message);
        }
      }
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }

    const summary: CrawlSummary = {
      totalPagesDiscovered: this.discoveredCount || this.results.length,
      totalPagesAnalyzed: this.results.filter(r => !r.blocked).length,
      blockedPages: this.results.filter(r => r.crawl_status !== 'success' && r.crawl_status !== 'robots_disallowed').length,
      robotsSkippedPages: this.results.filter(r => r.crawl_status === 'robots_disallowed').length,
      partialPages: this.results.filter(r => r.crawl_status === 'partial_content').length,
      reportMode: 'full'
    };

    if (summary.totalPagesAnalyzed === 0) {
      summary.reportMode = 'protected_site_limited';
    } else if (summary.blockedPages > 0 || summary.robotsSkippedPages > 0) {
      summary.reportMode = 'partial';
    }

    return {
      pages: this.results,
      allLinks: this.allLinks,
      summary
    };
  }

  private async fetchPage(url: string): Promise<PageData> {
    const startTime = Date.now();

    if (this.config.use_js && this.browser) {
      try {
        const context = await this.browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        try {
          const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          const html = await page.content();
          const status = response?.status() || 200;
          const headers = response?.headers() || {};
          const responseTime = Date.now() - startTime;

          const detection = detectCrawlStatus(html, status, headers, url);

          let screenshotPath;
          if (this.config.capture_screenshots && !detection.isBlocked) {
             const { v4: uuidv4 } = require('uuid');
             screenshotPath = `screenshots/${uuidv4()}.png`;
          }

          await page.close();
          await context.close();
          
          return { 
            url, html, status, headers, 
            response_time_ms: responseTime, 
            screenshot_path: screenshotPath,
            crawl_status: detection.status,
            blocked: detection.isBlocked,
            block_reason: detection.reason
          };
        } catch (pwErr: any) {
          await page.close();
          await context.close();
          return this.fetchWithAxios(url, startTime);
        }
      } catch (e) {
        return this.fetchWithAxios(url, startTime);
      }
    } else {
      return this.fetchWithAxios(url, startTime);
    }
  }

  private async fetchWithAxios(url: string, startTime: number): Promise<PageData> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        validateStatus: () => true
      } as any);

      const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const detection = detectCrawlStatus(html, response.status, response.headers as any, url);

      return {
        url,
        html,
        status: response.status,
        headers: response.headers as any,
        response_time_ms: Date.now() - startTime,
        crawl_status: detection.status,
        blocked: detection.isBlocked,
        block_reason: detection.reason
      };
    } catch (err: any) {
      return {
        url,
        html: '',
        status: err.response?.status || 500,
        headers: {},
        response_time_ms: Date.now() - startTime,
        crawl_status: 'network_error',
        blocked: true,
        block_reason: err.message
      };
    }
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    if (!html) return [];
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl);
          if (!['http:', 'https:'].includes(absoluteUrl.protocol)) return;
          absoluteUrl.hash = '';
          const finalUrl = absoluteUrl.toString();
          if (!links.includes(finalUrl)) links.push(finalUrl);
        } catch (e) { }
      }
    });

    return links;
  }
}
