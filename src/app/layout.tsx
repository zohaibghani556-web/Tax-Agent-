import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ConditionalLayout } from '@/components/layout/ConditionalLayout';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const SITE_URL = 'https://taxagent.ai';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TaxAgent.ai — AI-Powered Canadian Tax Filing | Free for Simple Returns',
    template: '%s | TaxAgent.ai',
  },
  description:
    'File your 2025 Canadian taxes with AI guidance. Upload your T4, get your exact refund calculated, and receive a personalized CRA filing guide. Free for simple returns. PIPEDA compliant, data stored in Canada.',
  keywords: [
    'Canadian tax filing',
    'AI tax agent',
    'CRA tax return 2025',
    'T4 upload',
    'RRSP calculator',
    'Ontario tax',
    'free tax filing Canada',
    'tax refund calculator Canada',
    '2025 tax season',
    'T4 OCR',
    'tax software Canada',
    'PIPEDA compliant tax',
  ],
  authors: [{ name: 'TaxAgent.ai' }],
  creator: 'TaxAgent.ai',
  publisher: 'TaxAgent.ai',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: SITE_URL,
    siteName: 'TaxAgent.ai',
    title: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
    description:
      'File your 2025 Canadian taxes with AI. Upload T4, get your exact refund. Free for simple returns. Data stored in Canada.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TaxAgent.ai — AI-Powered Canadian Tax Filing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaxAgent.ai — File Canadian Taxes with AI',
    description:
      'AI-guided Canadian tax filing. Upload T4, get your exact refund. Free for simple returns.',
    images: ['/og-image.png'],
    creator: '@TaxAgentAI',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: SITE_URL },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TaxAgent.ai',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CAD',
      description: 'Free for simple T4 returns',
    },
    description:
      'AI-powered Canadian tax filing assistant. Upload T4, get refund calculated, receive personalized CRA filing guide.',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TaxAgent.ai',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'AI-powered Canadian tax filing assistant for 2025 tax season.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@taxagent.ai',
      availableLanguage: ['English', 'French'],
    },
    areaServed: 'CA',
    foundingDate: '2025',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TaxAgent.ai',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is TaxAgent.ai free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! TaxAgent.ai is completely free for simple returns with a single T4. Pro plan ($29/yr) unlocks multiple slip types, RRSP optimization, and the what-if scenario engine.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my data safe with TaxAgent.ai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Absolutely. Your data is encrypted in transit and at rest, stored exclusively on Canadian servers (Supabase ca-central-1), and we are fully PIPEDA compliant. You can delete your account and all data at any time.',
        },
      },
      {
        '@type': 'Question',
        name: 'How accurate is TaxAgent.ai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'All calculations use a deterministic TypeScript engine against official CRA rates and thresholds for 2025, cross-validated against CRA published examples. The AI is only used for conversational assessment — never for math.',
        },
      },
      {
        '@type': 'Question',
        name: 'What tax slips does TaxAgent.ai support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We support T4 (employment income), T5 (investment income), T5008 (securities dispositions), T3 (trust income), T4A (pension and other income), and T2202 (tuition slips). All are read automatically via OCR.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does TaxAgent.ai handle Ontario taxes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. TaxAgent.ai calculates both federal and Ontario provincial tax, including Ontario Trillium Benefit, Ontario Health Premium, and Ontario surtax for 2025.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can CPAs use TaxAgent.ai for their clients?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. TaxAgent.ai automates client onboarding and slip extraction for CPA firms. Clients self-onboard via AI chat and photograph their slips — every CRA box is extracted automatically, eliminating manual data entry. Email cpa@taxagent.ai to learn more.',
        },
      },
    ],
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={geist.variable}>
      <head>
        {/* Skip to content link for accessibility */}
        <style>{`
          .skip-link {
            position: absolute;
            top: -40px;
            left: 0;
            background: #10B981;
            color: white;
            padding: 8px;
            z-index: 100;
            font-size: 14px;
          }
          .skip-link:focus {
            top: 0;
          }
        `}</style>
      </head>
      <body className="antialiased font-sans">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <ConditionalLayout>
          <main id="main-content">
            {children}
          </main>
        </ConditionalLayout>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SpeedInsights />
      </body>
    </html>
  );
}
