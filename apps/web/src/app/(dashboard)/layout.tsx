"use client"

import { ReactNode, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import {
  LayoutDashboard,
  FolderKanban,
  Search,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react"
import { cn } from "utils"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Scans", href: "/scans", icon: Search },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

const MotionLink = motion(Link)

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  useEffect(() => {
    setHasHydrated(true)
  }, [])

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? 272 : 88,
          x:
            hasHydrated && typeof window !== "undefined" && window.innerWidth < 1024
              ? isMobileMenuOpen
                ? 0
                : -272
              : 0,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-sidebar/90 shadow-elevated backdrop-blur-xl lg:relative print:hidden",
          !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 to-accent/10 text-primary shadow-glow-sm"
            >
              <Zap className="h-5 w-5 fill-primary" />
            </motion.div>
            {isSidebarOpen && (
              <span className="truncate font-bold tracking-tight text-foreground/95">
                AUTOPILOT QA
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <MotionLink
                key={item.name}
                href={item.href}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                  isActive
                    ? "border border-primary/30 bg-gradient-to-r from-primary/25 to-primary/5 font-semibold text-foreground shadow-glow-sm"
                    : "text-muted hover:bg-white/[0.05] hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-primary" : "opacity-90"
                  )}
                />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </MotionLink>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={signOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-muted transition-colors hover:bg-error/10 hover:text-error"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </motion.button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-surface/60 px-4 shadow-soft backdrop-blur-xl md:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-xl p-2 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="hidden rounded-xl p-2 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground lg:block"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.button>
            <h2 className="hidden text-lg font-semibold tracking-tight sm:block">
              {navItems.find((item) => pathname.startsWith(item.href))?.name || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">
                {hasHydrated ? user?.user_metadata?.full_name || "User" : "..." }
              </p>
              <p className="mt-1 text-xs text-muted">{hasHydrated ? user?.email : "..."}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/5 text-sm font-bold text-primary shadow-glow-sm">
              {hasHydrated ? (user?.email?.[0].toUpperCase() || "U") : "?"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 print:p-0">
          <div className="mx-auto max-w-7xl print:max-w-none">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @media print {
          aside,
          header,
          nav,
          button {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
