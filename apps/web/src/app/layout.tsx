import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'sonner'
import Providers from './providers'
import NextTopLoader from 'nextjs-toploader'
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: {
    default: 'Autopilot QA | AI-Powered Website Auditing',
    template: '%s | Autopilot QA',
  },
  description: 'AI-first auditing platform. Scan, analyze, and optimize your website automatically with Gemini.',
  keywords: ['website audit', 'SEO', 'accessibility', 'AI', 'web quality', 'performance'],
  openGraph: {
    title: 'Autopilot QA',
    description: 'AI-powered website auditing for modern development teams.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable)}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>
          <NextTopLoader showSpinner={false} color="#8b7cff" height={2} />
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
