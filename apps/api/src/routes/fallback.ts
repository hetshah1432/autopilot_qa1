import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { analyze as seoAnalyze } from '../engine/analyzers/seo-analyzer';
import { analyze as a11yAnalyze } from '../engine/analyzers/accessibility-analyzer';
import { analyze as perfAnalyze } from '../engine/analyzers/performance-analyzer';
import { analyze as securityAnalyze } from '../engine/analyzers/security-analyzer';
import { analyze as uxAnalyze } from '../engine/analyzers/ux-analyzer';
import { calculateScores } from '../engine/score-engine';
import { Issue } from 'types';

const router = Router();

/**
 * POST /api/scans/:id/fallback/raw-html
 * Allows manual submission of HTML for a specific scan.
 */
router.post('/:id/fallback/raw-html', async (req, res) => {
  const { id } = req.params;
  const { html, url: pageUrl } = req.body;
  const userId = (req as any).user?.id;

  if (!html || !pageUrl) {
    return res.status(400).json({ error: 'HTML and Page URL are required.' });
  }

  try {
    // 1. Verify Scan Ownership
    const { data: scan, error: scanErr } = await supabase
      .from('scans')
      .select('*, projects(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (scanErr || !scan) {
      return res.status(404).json({ error: 'Scan not found or unauthorized.' });
    }

    // 2. Create Page Record for the manual submission
    const { data: pageRecord, error: pageErr } = await supabase
      .from('pages')
      .insert({
        scan_id: id,
        url: pageUrl,
        status_code: 200,
        response_time_ms: 0,
        crawl_status: 'success',
        blocked: false
      })
      .select()
      .single();

    if (pageErr) throw pageErr;

    const { classifyPage } = await import('../engine/page-classifier');
    const role = classifyPage(pageUrl, html);

    // 3. Run Analyzers on the submitted HTML
    const mockPageData = {
       url: pageUrl,
       html,
       status: 200,
       headers: {},
       response_time_ms: 500 // Assume 500ms for manual submit
    };

    const manualIssues: Issue[] = [
      ...seoAnalyze(mockPageData, role),
      ...a11yAnalyze(mockPageData, role),
      ...perfAnalyze(mockPageData, role),
      ...securityAnalyze(mockPageData, role),
      ...uxAnalyze(mockPageData, role)
    ];

    manualIssues.forEach(issue => {
      issue.page_id = pageRecord.id;
      issue.scan_id = id;
    });

    // 4. Save Issues to DB
    if (manualIssues.length > 0) {
      const { error: issueErr } = await supabase
        .from('issues')
        .insert(manualIssues);
      if (issueErr) throw issueErr;
    }

    // 5. Update Scan Scores and Report Mode (Comprehensive Refetch)
    const { data: allScanIssues, error: fetchErr } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', id);

    if (fetchErr) throw fetchErr;
    
    const { data: scanPages } = await supabase.from('pages').select('id').eq('scan_id', id);
    const pageIds = (scanPages || []).map(p => p.id);
    const allIssues = allScanIssues || [];
    const manualStatus: any = {
       seo: 'ok',
       accessibility: 'ok',
       performance: 'ok',
       security: 'ok',
       ux: 'ok',
       broken_links: 'ok'
    };
    const newScores = calculateScores(allIssues, pageIds, manualStatus);

    console.log(`[FallbackAPI] Finalized Score for ${id} -> Overall: ${newScores.overall} | Details: SEO:${newScores.seo} A11y:${newScores.accessibility} Perf:${newScores.performance} Sec:${newScores.security} UX:${newScores.ux}`);

    await supabase
      .from('scans')
      .update({
        report_mode: 'owner_assisted',
        overall_score: newScores.overall,
        status: 'complete',
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    const { error: scoreUpdateErr } = await supabase
       .from('scan_scores')
       .upsert({
          ...newScores,
          scan_id: id
       }, { onConflict: 'scan_id' });

    if (scoreUpdateErr) throw scoreUpdateErr;

    // 6. Trigger AI Engine async (Non-blocking, silent background update)
    const { aiEngine } = await import('../engine/ai-engine');
    
    // Run the long process in background with strict persistence
    (async () => {
      try {
        // We only generate the summary now, not the priority list requested to be removed
        const aiResults = await aiEngine.processAll(allIssues, newScores, scan.projects?.url || pageUrl, 1, 'owner_assisted', () => {});
        console.log(`[FallbackAPI] AI Results received for ${id}, persisting...`);
        
        // Save Issue Explanations (Resiliently)
        const explanationProms = allIssues.map(issue => {
          if (!issue.id) return Promise.resolve();
          const explanation = aiResults.issueExplanations.get(issue.id);
          if (!explanation) return Promise.resolve();
          
          return supabase.from('issues').update({
            ai_explanation: explanation.explanation,
            ai_why_it_matters: explanation.whyItMatters,
            ai_how_to_fix: explanation.howToFix,
            ai_code_snippet: explanation.codeSnippet,
          }).eq('id', issue.id);
        });
        await Promise.allSettled(explanationProms);

        // Update Scores and AI Summaries (Priority List is empty/gone)
        await supabase.from('scan_scores').update({
          ai_summary: aiResults.summary || 'Analysis complete.',
          ai_priority_list: '[]', // Explicitly empty as requested to remove the feature
        }).eq('scan_id', id);

      } catch (aiErr: any) {
        console.error(`[FallbackAPI] AI Steps failed (silent):`, aiErr.message);
      }
    })();

    return res.json({ 
      success: true, 
      message: 'HTML analyzed successfully. Report is being updated.',
      newScore: newScores.overall
    });
  } catch (err: any) {
    console.error('[FallbackAPI] Error:', err.message);
    return res.status(500).json({ error: 'Failed to process manual submission.' });
  }
});

export default router;
