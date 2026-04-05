import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'TaxAgent.ai pricing for 2025 Canadian tax season. Free for simple T4 returns. Pro plan for complex returns with RRSP, capital gains, and multiple slips.',
  openGraph: {
    title: 'Pricing | TaxAgent.ai',
    description: 'Free for simple T4 returns. Pro plan $29/yr for complex Canadian 2025 tax returns.',
    url: 'https://taxagent-pink.vercel.app/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
