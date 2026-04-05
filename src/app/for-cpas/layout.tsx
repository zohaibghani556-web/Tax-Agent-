import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For CPAs',
  description:
    'TaxAgent.ai CPA Portal — automate client onboarding, OCR slip extraction, and data export for TaxCycle and Cantax. Save 3+ hours per Canadian 2025 tax return.',
  openGraph: {
    title: 'For CPAs | TaxAgent.ai',
    description: 'Automate Canadian tax data entry. Client portal, OCR, and TaxCycle export for accounting firms.',
    url: 'https://taxagent-pink.vercel.app/for-cpas',
  },
};

export default function ForCPAsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
