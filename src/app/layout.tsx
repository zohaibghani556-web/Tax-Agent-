import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
  description:
    'The first AI tax agent built for Canadians. Get personalised guidance, automatic slip reading, and a step-by-step 2025 tax filing guide — free for simple returns.',
  keywords: [
    'Canadian tax filing',
    'AI tax agent',
    'T4',
    'CRA',
    'tax refund',
    '2025 taxes',
    'RRSP',
    'Ontario tax',
  ],
  openGraph: {
    title: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
    description:
      'The first AI tax agent built for Canadians. File your 2025 taxes with confidence.',
    siteName: 'TaxAgent.ai',
    locale: 'en_CA',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={cn("font-sans", geist.variable)}>
      <body className="antialiased font-sans">
        {/* ── Global Navigation ── */}
        <header className="sticky top-0 z-50 bg-[#1A2744] shadow-md">
          <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-white tracking-tight hover:opacity-90 transition-opacity"
            >
              TaxAgent<span className="text-[#10B981]">.ai</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-300">
              <Link href="/calculator" className="hover:text-white transition">
                Refund Estimator
              </Link>
              <Link href="/filing-guide" className="hover:text-white transition">
                Filing Guide
              </Link>
              <Link
                href="/onboarding"
                className="rounded-lg bg-[#10B981] px-4 py-2 font-semibold text-white hover:bg-[#059669] transition"
              >
                Start Free
              </Link>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
