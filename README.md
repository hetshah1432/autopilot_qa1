# Autopilot QA 🚀

[![Final Sprint](https://img.shields.io/badge/Status-Phase%205%20Complete-green?style=for-the-badge)](https://autopilotqa.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%7C%20Express%20%7C%20Supabase-blue?style=for-the-badge)](https://github.com)

**Autopilot QA** is an AI-first, production-grade website auditing SaaS platform. It leverages Playwright for deep crawling, custom scoring engines for multi-category health assessment, and Google Gemini AI for developer-ready fix suggestions and executive summaries.

---

## 🌟 Key Features

- **AI-Powered Analysis**: Beyond simple linting, Gemini analyzes *meaning* and *context* to provide "Why it Matters" and "How to Fix" guides.
- **Deep Exploration**: Headless Playwright engine with full JavaScript execution for modern SPAs.
- **Comparison Engine**: Track your progress with side-by-side audit comparisons and score deltas.
- **Onboarding Wizard**: Guided experience for new users to launch their first scan in under 60 seconds.
- **Public Sharing**: Share secure, unauthenticated reports with clients or stakeholders.
- **Developer Chat Assistant**: Ask context-aware questions about your specific findings directly in the report view.
- **One-Click Fixes**: Generated before/after code blocks for immediate issue resolution.

---

## 🛠️ Tech Stack

- **Monorepo**: Turborepo
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, TanStack Query
- **Backend**: Express + TypeScript, Playwright, Cheerio, Google Gemini API
- **Infrastructure**: Supabase (PostgreSQL, Auth, RLS), Docker
- **UI System**: Custom "Watermelon-inspired" sleek dark-mode design system

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [Supabase Account](https://supabase.com/)
- [Google AI Studio Key](https://aistudio.google.com/) (Gemini)

### 2. Environment Setup
Fill the `.env` variables in both `apps/web` and `apps/api` (refer to `.env.example`).

### 3. Install & Run
```bash
npm install
npx turbo run dev
```

### 4. Seed Demo Data (Optional)
Prepare your dashboard with realistic data immediately:
```bash
cd apps/api
npm run seed:demo
```

---

## 🧪 Demo Walkthrough (5 Min)
1. **Login**: Use `demo@autopilotqa.com` / `Demo1234!` (after seeding).
2. **Dashboard**: Observe the "Health Score Trend" and "Recent Projects".
3. **New Project**: Create a project for `https://example.com`.
4. **Scan**: Run a "Quick Scan" and watch the live SSE progress terminal with confetti on completion.
5. **Report**: Explore the Radar Chart and AI Summary. Click "Generate Fix" on a critical issue.
6. **Chat**: Ask the assistant: *"What should I fix first for SEO?"*.
7. **History**: Select two historical scans and click "Compare Scans" to see the score delta.

---

## 🏗️ Architecture
```
[User] → [Next.js Dashboard]
            ↓ (REST + Auth)
 [Express Orchestrator] → [Crawl Engine (Playwright)]
            ↓                     ↓ (DOM Tree)
 [Google Gemini AI] ← [Analysis Modules (SEO, Security, etc)]
            ↓                     ↓ (Scored Data)
      [Supabase DB] ← (Final Result)
            ↓
    [SSE Real-time Events] → [Frontend Progress Page]
```

---

## 📦 Deployment

### Frontend (Vercel)
- Root: `apps/web`
- Build Command: `cd ../.. && turbo run build --filter=web`
- Output: `apps/web/.next`

### Backend (Render/Railway)
- Root: `apps/api`
- Command: `npx playwright install chromium --with-deps && npm run build && npm start`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secret.
