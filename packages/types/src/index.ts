export interface Project {
  id: string;
  user_id: string;
  name: string;
  url: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type CrawlStatus = 
  | 'success' 
  | 'blocked_waf' 
  | 'blocked_captcha' 
  | 'blocked_js_challenge' 
  | 'rate_limited' 
  | 'robots_disallowed' 
  | 'login_required' 
  | 'partial_content' 
  | 'network_error' 
  | 'timeout';

export interface Scan {
  id: string;
  project_id: string;
  user_id: string;
  status: 'queued' | 'crawling' | 'analyzing' | 'ai_processing' | 'complete' | 'failed' | 'completed_with_errors';
  config: ScanConfig;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  overall_score?: number;
  page_count: number;
  issue_count: number;
  public_token: string;
  report_mode?: 'full' | 'partial' | 'protected_site_limited' | 'owner_assisted';
  crawl_limitations?: any;
}

export interface ScanConfig {
  [key: string]: any;
}

export interface Page {
  id: string;
  scan_id: string;
  url: string;
  status_code?: number;
  title?: string;
  response_time_ms?: number;
  screenshot_path?: string;
  crawled_at: string;
  crawl_status?: CrawlStatus;
  blocked?: boolean;
  block_reason?: string;
}

export type IssueCategory = 'seo' | 'accessibility' | 'performance' | 'security' | 'ux' | 'broken_links';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type PageRole = 'homepage' | 'landing_page' | 'blog_article' | 'docs_page' | 'contact_page' | 'product_detail' | 'generic_internal' | 'unknown';
export type DetectionType = 'deterministic' | 'heuristic' | 'ai_assisted';

export interface Issue {
  id?: string;
  scan_id?: string;
  page_id?: string;
  category: IssueCategory;
  subcategory?: string;
  severity: IssueSeverity;
  confidence: number; // 0 to 1
  detection_type: DetectionType;
  scope: 'page' | 'sitewide';
  title: string;
  description?: string;
  evidence?: string;
  affected_pages_count?: number;
  page_role?: PageRole;
  remediation_priority?: IssueSeverity;
  selector?: string;
  context?: string;
  ai_explanation?: string;
  ai_why_it_matters?: string;
  ai_how_to_fix?: string;
  ai_code_snippet?: string;
  ai_fix_suggestion?: string;
  created_at?: string;
}

export type CategoryStatus = 'ok' | 'analyzer_failed' | 'not_analyzed';

export interface ScanScore {
  id: string;
  scan_id: string;
  overall?: number | null;
  seo?: number | null;
  accessibility?: number | null;
  performance?: number | null;
  security?: number | null;
  ux?: number | null;
  broken_links?: number | null;
  
  seo_status?: CategoryStatus;
  accessibility_status?: CategoryStatus;
  performance_status?: CategoryStatus;
  security_status?: CategoryStatus;
  ux_status?: CategoryStatus;
  broken_links_status?: CategoryStatus;

  ai_summary?: string;
  ai_executive_summary?: string;
  ai_priority_list?: any;
  created_at: string;
}

export interface ScanEvent {
  id: string;
  scan_id: string;
  event_type: string;
  message?: string;
  data?: any;
  created_at: string;
}
