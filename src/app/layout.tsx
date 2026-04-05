import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NavBar } from '@/components/nav-bar';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL('https://taxagent-pink.vercel.app'),
  title: {
    default: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
    template: '%s | TaxAgent.ai',
  },
  description:
    'AI-powered Canadian 2025 tax filing assistant. Get your refund estimate, automatic slip reading, and a step-by-step filing guide. Free for simple returns.',
  keywords: [
    'Canadian tax filing', 'AI tax agent', 'T4', 'CRA', 'tax refund',
    '2025 taxes', 'RRSP', 'Ontario tax', 'tax software Canada',
  ],
  openGraph: {
    title: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
    description: 'File your 2025 Canadian taxes with AI guidance. Free for simple returns.',
    siteName: 'TaxAgent.ai',
    locale: 'en_CA',
    type: 'website',
    url: 'https://taxagent-pink.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
    description: 'File your 2025 Canadian taxes with AI guidance. Free for simple returns.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={geist.variable}>
      <body className="antialiased font-sans bg-white text-[var(--text-primary)]">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
