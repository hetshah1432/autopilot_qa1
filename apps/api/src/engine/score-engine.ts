import { Issue, ScanScore, PageRole, DetectionType, CategoryStatus } from "types"

export const Weights = {
  seo: 0.20,
  accessibility: 0.20,
  performance: 0.20,
  security: 0.25,
  ux: 0.10,
  broken_links: 0.05
}

const Deductions = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 1
}

// ─── AUDIT V2 WEIGHTING LOGIC ───
const DetectionMultipliers: Record<DetectionType, number> = {
  deterministic: 1.0,
  heuristic: 0.6,
  ai_assisted: 0.3
};

const RoleMultipliers: Record<PageRole, number> = {
  homepage: 1.5,
  landing_page: 1.3,
  blog_article: 1.1,
  product_detail: 1.0,
  docs_page: 0.7,
  contact_page: 0.8,
  generic_internal: 0.7,
  unknown: 1.0
};

export function calculateScores(
  issues: Issue[], 
  pageIds: string[] = [], 
  categoryStatuses: Record<string, CategoryStatus> = {}
): Partial<ScanScore> {
  const uniquePages = pageIds.length > 0 
    ? pageIds 
    : Array.from(new Set(issues.filter(i => i.page_id).map(i => i.page_id!).filter(Boolean)));
  
  const totalPages = Math.max(1, uniquePages.length);
  const finalCategoryScores: any = {};
  const finalCategoryStatus: any = {};

  Object.keys(Weights).forEach(cat => {
    // 1. Determine Status
    const status = categoryStatuses[cat] || 'ok';
    finalCategoryStatus[`${cat}_status`] = status;

    if (status !== 'ok') {
       finalCategoryScores[cat] = null;
       return;
    }

    let totalDeduction = 0;
    const categoryIssues = issues.filter(i => (i.category || '').toLowerCase() === cat);

    categoryIssues.forEach((issue: Issue) => {
       const severity = (issue.severity || 'low').toLowerCase() as keyof typeof Deductions;
       const baseDeduction = Deductions[severity] || 2;
       
       const confidenceWeight = issue.confidence !== undefined ? issue.confidence : (DetectionMultipliers[issue.detection_type] || 1.0);
       const roleWeight = issue.page_role ? (RoleMultipliers[issue.page_role] || 1.0) : 1.0;
       
       const count = issue.affected_pages_count || 1;
       const repetitionFactor = Math.log2(1 + count);
       
       totalDeduction += baseDeduction * confidenceWeight * roleWeight * repetitionFactor;
    });

    const normalizationFactor = Math.sqrt(totalPages); 
    const categoryScore = Math.max(0, 100 - (totalDeduction / normalizationFactor));
    finalCategoryScores[cat] = Math.round(categoryScore);
  });

  // Calculate Weighted Overall (Excluding failed categories)
  let overallSum = 0;
  let totalAnalyzedWeight = 0;

  Object.entries(Weights).forEach(([cat, weight]) => {
     const score = finalCategoryScores[cat];
     if (score !== null && score !== undefined) {
        overallSum += score * weight;
        totalAnalyzedWeight += weight;
     }
  });

  const overall = totalAnalyzedWeight > 0 
    ? Math.round(overallSum / totalAnalyzedWeight) 
    : null;

  return {
    ...finalCategoryScores,
    ...finalCategoryStatus,
    overall,
    ai_executive_summary: "Calculating with AI in progress..."
  };
}
