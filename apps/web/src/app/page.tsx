"use client"

import { motion } from "framer-motion"
import Link from "next/link"

const Zap = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const ArrowRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
const ShieldCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
);
const Search = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const BarChart = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
);

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  const features = [
    {
      title: "SEO Optimization",
      description: "Analyze your meta tags, structured data, and content to rank higher on search engines automatically.",
      icon: <Search className="w-8 h-8 text-primary" />,
    },
    {
      title: "Accessibility",
      description: "Ensure your website meets WCAG standards and is usable by everyone, everywhere.",
      icon: <Search className="w-8 h-8 text-success" />,
    },
    {
      title: "Performance",
      description: "Identify bottlenecks affecting load times, Core Web Vitals, and resource delivery.",
      icon: <Zap className="w-8 h-8 text-warning" />,
    },
    {
      title: "Security",
      description: "Check for missing security headers, mixed content, and vulnerable library versions.",
      icon: <ShieldCheck className="w-8 h-8 text-error" />,
    },
    {
      title: "UX Evaluation",
      description: "Diagnose broken links, mobile responsiveness, and layout shifts that ruin user experience.",
      icon: <BarChart className="w-8 h-8 text-info" />,
    },
    {
      title: "AI Insights",
      description: "Get actionable, step-by-step code suggestions from our powerful Gemini AI integration.",
      icon: <BarChart className="w-8 h-8 text-accent" />,
    },
  ]

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="z-40 flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/25 to-accent/10 text-primary shadow-glow-sm">
              <Zap className="h-5 w-5 fill-primary" />
            </div>
            AUTOPILOT QA
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-all md:bg-transparent md:text-muted md:hover:text-foreground bg-primary text-primary-foreground shadow-glow-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hidden md:block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-[transform,box-shadow] hover:shadow-glow active:scale-[0.98]"
            >
              Start Free Audit
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative px-6 pb-20 pt-32 lg:pb-32 lg:pt-48">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-radial-hero opacity-90" />

        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 text-5xl font-extrabold tracking-tight md:text-7xl"
          >
            AI-Powered <br className="hidden md:block" />
            <span className="text-gradient-neo">Website Auditing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-12 max-w-2xl text-lg text-muted md:text-xl"
          >
            Autopilot QA scans your web pages to uncover critical issues across SEO, accessibility, performance, and security — then uses AI to tell you exactly how to fix them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-8 py-4 text-base font-semibold leading-6 text-primary-foreground shadow-glow transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-glow active:scale-[0.98] sm:w-auto"
            >
              Start Free Audit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/[0.08] bg-surface/80 px-8 py-4 text-base font-semibold leading-6 text-foreground shadow-soft backdrop-blur-sm transition-all hover:border-primary/25 hover:bg-input sm:w-auto"
            >
              Explore Features
            </Link>
          </motion.div>
        </div>
      </section>

      <section id="features" className="border-y border-white/[0.06] bg-surface/40 px-6 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Comprehensive Analysis</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted">
              Leave no stone unturned. Our engine crawls your site to gather detailed metrics across six critical categories.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="group rounded-[22px] border border-white/[0.07] bg-background/60 p-8 shadow-soft backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-glow-sm"
              >
                <div className="mb-6 inline-block rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-transparent p-4 transition-transform duration-300 group-hover:scale-105">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="leading-relaxed text-muted">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 py-32">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-4xl font-bold">Ready to supercharge your web quality?</h2>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-glow transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-glow active:scale-[0.98]"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between md:flex-row">
          <div className="mb-4 flex items-center gap-2 font-bold md:mb-0">
            <Zap className="h-5 w-5 text-primary" />
            AUTOPILOT QA
          </div>
          <p className="text-sm text-muted">© {new Date().getFullYear()} Autopilot QA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
