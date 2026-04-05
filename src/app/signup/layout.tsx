import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your free TaxAgent.ai account and start filing your 2025 Canadian tax return with AI guidance.',
  openGraph: {
    title: 'Create Account | TaxAgent.ai',
    description: 'Start filing your 2025 Canadian tax return for free. No credit card required.',
    url: 'https://taxagent-pink.vercel.app/signup',
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
