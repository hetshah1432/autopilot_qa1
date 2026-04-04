"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateScores = calculateScores;
const Weights = {
    seo: 0.20,
    accessibility: 0.20,
    performance: 0.20,
    security: 0.25,
    ux: 0.10,
    broken_links: 0.05
};
const Deductions = {
    critical: 20,
    high: 10,
    medium: 5,
    low: 2,
    info: 1
};
function calculateScores(issues) {
    const categoryScores = {
        seo: 100,
        accessibility: 100,
        performance: 100,
        security: 100,
        ux: 100,
        broken_links: 100
    };
    issues.forEach(issue => {
        const category = issue.category;
        const severity = issue.severity;
        const deduction = Deductions[severity] || 0;
        if (categoryScores[category] !== undefined) {
            categoryScores[category] -= deduction;
        }
    });
    // Clamp category scores to [0, 100]
    Object.keys(categoryScores).forEach(key => {
        categoryScores[key] = Math.max(0, categoryScores[key]);
    });
    // Weighted Overall
    let overall = 0;
    Object.entries(Weights).forEach(([cat, weight]) => {
        overall += (categoryScores[cat] || 100) * weight;
    });
    return {
        ...categoryScores,
        overall: Math.round(overall),
        ai_executive_summary: "Calculating with AI in progress..."
    };
}
