import * as cheerio from 'cheerio';
import { Issue, PageRole } from 'types';
import { v4 as uuidv4 } from 'uuid';

export function analyze(page: { url: string; html: string; response_time_ms: number }, role: PageRole): Issue[] {
  const issues: Issue[] = [];
  const $ = cheerio.load(page.html);

  // 1. Contextual Signals
  const scripts = $('script');
  const headScripts = $('head script:not([async]):not([defer])');
  const styles = $('link[rel="stylesheet"]');
  const images = $('img');
  
  // 2. Corroborating Signals (Technical Flags)
  const isHeavy = scripts.length > 15 || styles.length > 8 || images.length > 25;
  const hasBlockingResources = headScripts.length > 3;
  const missingDimensions = images.toArray().some(img => !$(img).attr('width') || !$(img).attr('height'));

  // 3. Timing-Based Response (Deterministic but Noisy)
  // Use new realistic thresholds: Medium >= 2.5s, High >= 4.0s, Critical >= 6.0s
  if (page.response_time_ms >= 2500) {
    let severity: 'medium' | 'high' | 'critical' = 'medium';
    let confidence = 0.6; // Timing alone is heuristic/noisy

    // Corroboration Logic: Elevate only if other technical signals are present
    if (page.response_time_ms >= 6000 && (isHeavy || hasBlockingResources)) {
      severity = 'critical';
      confidence = 0.9;
    } else if (page.response_time_ms >= 4000 && (isHeavy || hasBlockingResources || missingDimensions)) {
      severity = 'high';
      confidence = 0.8;
    }

    issues.push({
      category: 'performance',
      subcategory: 'server_response',
      severity,
      confidence,
      detection_type: 'deterministic',
      scope: 'page',
      page_role: role,
      title: severity === 'critical' ? 'Critical Server Latency' : 'Slow Server Response',
      description: `The page took ${page.response_time_ms}ms to respond. Timing-based findings are corroborated by ${isHeavy ? 'heavy asset count' : hasBlockingResources ? 'blocking scripts' : 'page structure'}.`,
      evidence: `Response Time: ${page.response_time_ms}ms | Scripts: ${scripts.length} | Images: ${images.length}`,
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  }

  // 4. Heavy Page Assets (Deterministic)
  if (isHeavy) {
     issues.push({
        category: 'performance',
        subcategory: 'resource_bloat',
        severity: 'medium',
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        page_role: role,
        title: 'Excessive Resource Payload',
        description: `Found ${scripts.length} scripts and ${images.length} images. High resource counts slow down document parsing and increase data usage.`,
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  // 5. Render-Blocking head scripts
  if (hasBlockingResources) {
      issues.push({
        category: 'performance',
        subcategory: 'render_blocking',
        severity: 'high',
        confidence: 1.0,
        detection_type: 'deterministic',
        scope: 'page',
        page_role: role,
        title: 'Render-Blocking Scripts in Head',
        description: `Detected ${headScripts.length} scripts in the <head> without "async" or "defer" attributes. These block the browser from rendering content until the script is downloaded and executed.`,
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
      });
  }

  // 6. Layout Stability Indicators (Heuristic but important)
  if (missingDimensions) {
    issues.push({
      category: 'performance',
      subcategory: 'layout_stability',
      severity: role === 'homepage' || role === 'landing_page' ? 'high' : 'medium',
      confidence: 0.8,
      detection_type: 'heuristic',
      scope: 'page',
      page_role: role,
      title: 'Layout Shift Risk (Missing Dimensions)',
      description: 'Multiple images found without explicit "width" or "height" attributes. This causes the layout to "jump" when images load, degrading the user experience.',
      id: uuidv4(),
      scan_id: '',
      page_id: '',
      created_at: new Date().toISOString()
    });
  }

  // 7. Legacy Format Detection
  const legacyImages = images.toArray().filter(img => {
     const src = $(img).attr('src')?.toLowerCase() || '';
     return src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png');
  });
  if (legacyImages.length > 5) {
     issues.push({
        category: 'performance',
        subcategory: 'modern_assets',
        severity: 'low',
        confidence: 0.7,
        detection_type: 'heuristic',
        scope: 'page',
        page_role: role,
        title: 'Use Modern Image Formats',
        description: 'Consider using WebP or AVIF instead of PNG/JPG for better compression without quality loss.',
        id: uuidv4(),
        scan_id: '',
        page_id: '',
        created_at: new Date().toISOString()
     });
  }

  return issues;
}
