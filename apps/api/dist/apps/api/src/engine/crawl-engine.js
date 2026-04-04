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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlEngine = void 0;
const playwright_1 = require("playwright");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const url_1 = require("url");
const https = __importStar(require("https"));
class CrawlEngine {
    startUrl;
    config;
    visited = new Set();
    queue = [];
    results = [];
    allLinks = [];
    browser = null;
    constructor(startUrl, config = {
        depth: 1,
        max_pages: 5,
        use_js: true,
        capture_screenshots: true,
        check_external: false
    }) {
        this.startUrl = startUrl;
        this.config = config;
        this.queue.push({ url: startUrl, depth: 0 });
    }
    async start(onProgress) {
        if (this.config.use_js) {
            try {
                this.browser = await playwright_1.chromium.launch({ headless: true });
            }
            catch (err) {
                console.warn(`[CrawlEngine] Playwright browser launch failed: ${err.message}. Falling back to static-only crawl.`);
                onProgress(`Browser engine unavailable: Falling back to static scanning mode.`);
                this.config.use_js = false; // Downgrade config for this run
            }
        }
        const domain = new url_1.URL(this.startUrl).hostname;
        while (this.queue.length > 0 && this.results.length < this.config.max_pages) {
            const current = this.queue.shift();
            if (this.visited.has(current.url))
                continue;
            this.visited.add(current.url);
            onProgress(`Crawling page ${this.results.length + 1} of max ${this.config.max_pages} — ${current.url}`);
            try {
                const pageData = await this.fetchPage(current.url);
                this.results.push(pageData);
                // Extract links for next depth
                if (current.depth < this.config.depth) {
                    const links = this.extractLinks(pageData.html, current.url);
                    links.forEach(link => {
                        const isExternal = new url_1.URL(link, current.url).hostname !== domain;
                        this.allLinks.push({
                            source: current.url,
                            target: link,
                            is_external: isExternal
                        });
                        if (!isExternal && !this.visited.has(link)) {
                            this.queue.push({ url: link, depth: current.depth + 1 });
                        }
                    });
                }
            }
            catch (err) {
                console.error(`Error crawling ${current.url}:`, err.message);
            }
        }
        if (this.browser)
            await this.browser.close();
        return {
            pages: this.results,
            allLinks: this.allLinks
        };
    }
    async fetchPage(url) {
        const startTime = Date.now();
        if (this.config.use_js && this.browser) {
            try {
                const page = await this.browser.newPage();
                try {
                    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                    const html = await page.content();
                    const status = response?.status() || 200;
                    const headers = response?.headers() || {};
                    const responseTime = Date.now() - startTime;
                    let screenshotPath;
                    if (this.config.capture_screenshots) {
                        screenshotPath = `screenshots/${crypto.randomUUID()}.png`;
                    }
                    await page.close();
                    return { url, html, status, headers, response_time_ms: responseTime, screenshot_path: screenshotPath };
                }
                catch (pwErr) {
                    console.warn(`Playwright failed for ${url}, falling back to axios: ${pwErr.message}`);
                    await page.close();
                    return this.fetchWithAxios(url, startTime);
                }
            }
            catch (e) {
                return this.fetchWithAxios(url, startTime);
            }
        }
        else {
            return this.fetchWithAxios(url, startTime);
        }
    }
    async fetchWithAxios(url, startTime) {
        try {
            const response = await axios_1.default.get(url, {
                timeout: 10000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            return {
                url,
                html: response.data,
                status: response.status,
                headers: response.headers,
                response_time_ms: Date.now() - startTime
            };
        }
        catch (err) {
            console.warn(`Axios fallback also failed for ${url}: ${err.message}`);
            return {
                url,
                html: '',
                status: err.response?.status || 500,
                headers: {},
                response_time_ms: Date.now() - startTime
            };
        }
    }
    extractLinks(html, baseUrl) {
        const $ = cheerio.load(html);
        const links = [];
        const domain = new url_1.URL(baseUrl).hostname;
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                try {
                    const absoluteUrl = new url_1.URL(href, baseUrl);
                    // Only follow http/https
                    if (!['http:', 'https:'].includes(absoluteUrl.protocol))
                        return;
                    // Remove hash
                    absoluteUrl.hash = '';
                    const finalUrl = absoluteUrl.toString();
                    if (!links.includes(finalUrl)) {
                        links.push(finalUrl);
                    }
                }
                catch (e) { }
            }
        });
        return links;
    }
}
exports.CrawlEngine = CrawlEngine;
