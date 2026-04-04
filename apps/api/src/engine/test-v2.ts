import { classifyPage } from './page-classifier';
import { analyze as perfAnalyze } from './analyzers/performance-analyzer';
import { calculateScores } from './score-engine';
import { Issue } from 'types';

async function testV2() {
  console.log('--- STARTING AUDIT V2.0 VALIDATION ---');

  // 1. Test Classification
  const homeRole = classifyPage('https://example.com/', '<html><title>Welcome Home</title></html>');
  const docsRole = classifyPage('https://example.com/docs/api', '<html><title>API Documentation</title></html>');
  console.log(`[Classification] Home: ${homeRole} | Docs: ${docsRole}`);

  // 2. Test Performance Damping
  // Scenario: Slow response (5s) but NO other issues.
  const noisyIssues = perfAnalyze({ url: 'https://ex.com', html: '<html></html>', response_time_ms: 5000 }, 'homepage');
  console.log(`[Performance] Latency-only severity: ${noisyIssues[0]?.severity} (Expected: medium)`);

  // Scenario: Slow response (5s) WITH blocking scripts.
  const corroboratedIssues = perfAnalyze({ 
    url: 'https://ex.com', 
    html: '<html><head><script src="a.js"></script><script src="b.js"></script><script src="c.js"></script><script src="d.js"></script></head></html>', 
    response_time_ms: 5000 
  }, 'homepage');
  console.log(`[Performance] Corroborated severity: ${corroboratedIssues.find(i => i.subcategory === 'server_response')?.severity} (Expected: high)`);

  // 3. Test Score Damping (Logarithmic)
  const singleIssue: Issue[] = [{
    category: 'seo',
    severity: 'medium',
    confidence: 1.0,
    detectionType: 'deterministic',
    scope: 'page',
    title: 'Missing Meta',
    affectedPagesCount: 1,
    pageRole: 'homepage'
  }];
  
  const manyIssues: Issue[] = [{
    category: 'seo',
    severity: 'medium',
    confidence: 1.0,
    detectionType: 'deterministic',
    scope: 'page',
    title: 'Missing Meta',
    affectedPagesCount: 10,
    pageRole: 'generic_internal'
  }];

  const scoreSingle = calculateScores(singleIssue, ['p1']);
  const scoreMany = calculateScores(manyIssues, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']);

  console.log(`[Scoring] Single Issue Score: ${scoreSingle.seo}`);
  console.log(`[Scoring] 10 Grouped Issues Score: ${scoreMany.seo}`);
  console.log('--- VALIDATION COMPLETE ---');
}

testV2().catch(console.error);
