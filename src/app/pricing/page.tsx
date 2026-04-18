'use client';

/**
 * NOTE: shadcn Accordion is not installed. FAQ uses a lightweight custom
 * accordion below. To upgrade: `npx shadcn@latest add accordion`, then
 * replace FaqItem with <Accordion> + <AccordionItem> + <AccordionTrigger>
 * + <AccordionContent> from '@/components/ui/accordion'.
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATION CONFIG
───────────────────────────────────────────────────────────────────────────── */

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: easeOut },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay, ease: easeOut },
  }),
};

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE COMPARISON DATA
───────────────────────────────────────────────────────────────────────────── */

const FEATURES: {
  label: string;
  simple: boolean | string;
  pro: boolean | string;
  family: boolean | string;
}[] = [
  { label: 'AI chat assessment',                  simple: true,  pro: true,  family: true  },
  { label: 'T4 OCR upload',                       simple: true,  pro: true,  family: true  },
  { label: 'Federal + Ontario tax calc',           simple: true,  pro: true,  family: true  },
  { label: 'Filing guide PDF',                     simple: true,  pro: true,  family: true  },
  { label: 'Canadian data storage',               simple: true,  pro: true,  family: true  },
  { label: 'All slip types (T5, T5008, T3, T4A)', simple: false, pro: true,  family: true  },
  { label: 'RRSP optimization',                   simple: false, pro: true,  family: true  },
  { label: 'What-if scenario engine',             simple: false, pro: true,  family: true  },
  { label: 'Missed credit finder',                simple: false, pro: true,  family: true  },
  { label: 'Capital gains + dividends',           simple: false, pro: true,  family: true  },
  { label: 'Self-employment income (T2125)',       simple: false, pro: true,  family: true  },
  { label: 'Retroactive recovery scan',           simple: false, pro: true,  family: true  },
  { label: 'Priority support',                    simple: false, pro: true,  family: true  },
  { label: 'Joint return optimizer',              simple: false, pro: false, family: true  },
  { label: 'Up to 5 returns',                     simple: false, pro: false, family: true  },
  { label: 'Dependant credit transfer',           simple: false, pro: false, family: true  },
  { label: 'Household dashboard',                 simple: false, pro: false, family: true  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   FAQ DATA
───────────────────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'Is my data safe?',
    a: 'Yes. Your data is encrypted in transit (TLS 1.3) and at rest (AES-256), stored exclusively on Canadian servers (ca-central-1), and we are fully PIPEDA compliant. You can delete your account and all data at any time.',
  },
  {
    q: 'How accurate is TaxAgent.ai?',
    a: 'All calculations use deterministic TypeScript against official CRA rates and thresholds for 2025, cross-validated against published CRA examples. AI is used only for conversation and OCR — never for math.',
  },
  {
    q: 'What slips are supported?',
    a: 'Simple: T4 only. Pro and Family: T4, T5, T5008, T3, T4A, T2202, and RRSP contribution receipts — all with automatic OCR reading.',
  },
  {
    q: 'Can I use it for my small business?',
    a: 'Yes — Pro includes self-employment income (T2125 equivalent), business expenses, and HST/GST estimates for Ontario-based sole proprietors.',
  },
  {
    q: 'What if I have a complex return?',
    a: 'Pro handles multi-slip, multi-income returns including employment, investments, rental income, and self-employment. Family adds joint optimizer and household-level deduction splitting for up to 5 returns.',
  },
  {
    q: 'How is this different from TurboTax?',
    a: 'TaxAgent uses a conversational AI to understand your situation first, then calculates — not the other way around. We also support OCR slip reading, missing credit detection, and retroactive recovery scanning that TurboTax does not offer.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE COMPARISON CELL
───────────────────────────────────────────────────────────────────────────── */

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-[var(--emerald)]" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-white/20" />;
  return <span className="text-sm text-white/60">{value}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   FAQ ACCORDION ITEM
   TODO: replace with shadcn Accordion once installed via:
         npx shadcn@latest add accordion
───────────────────────────────────────────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white/40 flex-shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 pt-4 text-sm text-white/50 leading-relaxed border-t border-white/5">
          {a}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRICING CARD (shadcn Card + Button wrapped in motion for entrance)
───────────────────────────────────────────────────────────────────────────── */

interface TierCardProps {
  planName: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaLabel: string;
  ctaHref: string;
  delay?: number;
}

function TierCard({
  planName,
  price,
  period,
  description,
  features,
  isPopular = false,
  ctaLabel,
  ctaHref,
  delay = 0,
}: TierCardProps) {
  return (
    <motion.div
      variants={scaleIn}
      custom={delay}
      whileHover={{
        y: -6,
        boxShadow: isPopular
          ? '0 0 80px rgba(16,185,129,0.18), 0 28px 56px rgba(0,0,0,0.45)'
          : '0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.2)',
      }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col"
    >
      {/* Most popular badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--emerald)] px-3 py-1 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Most popular
          </span>
        </div>
      )}

      {/* shadcn Card — visual overrides via className + style */}
      <Card
        className="relative flex flex-col flex-1 rounded-2xl p-0 gap-0 ring-0 border-0 bg-transparent overflow-visible"
        style={{
          background: isPopular
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))'
            : 'var(--surface-overlay)',
          border: isPopular
            ? '1px solid rgba(16,185,129,0.40)'
            : '1px solid var(--border)',
          boxShadow: isPopular
            ? '0 0 60px rgba(16,185,129,0.12), 0 20px 40px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Breathing glow for Pro card */}
        {isPopular && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 60px rgba(16,185,129,0.15)', borderRadius: 16 }}
          />
        )}

        <CardContent className="flex flex-col flex-1 p-8 gap-0">
          {/* Plan name */}
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
            style={{ color: isPopular ? 'var(--emerald)' : 'rgba(255,255,255,0.5)' }}
          >
            {planName}
          </p>

          {/* Price */}
          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold text-white tabular-nums">{price}</span>
            {period && (
              <span className="text-base text-white/40 mb-1">{period}</span>
            )}
          </div>
          <p className="text-sm text-white/50 mb-7">{description}</p>

          {/* Divider */}
          <div
            className="h-px mb-6"
            style={{
              background: isPopular
                ? 'linear-gradient(90deg, rgba(16,185,129,0.5), transparent)'
                : 'rgba(255,255,255,0.07)',
            }}
          />

          {/* Feature list */}
          <ul className="space-y-2.5 flex-1 mb-8">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center bg-emerald-500/15">
                  <Check className="h-3 w-3 text-[var(--emerald)]" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {/* shadcn Button — pill override */}
          <Button
            asChild
            className={cn(
              'w-full rounded-full h-auto py-3.5 text-sm font-semibold transition-colors',
              isPopular
                ? 'bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] text-white border-0'
                : 'bg-transparent hover:bg-white/10 text-white border border-white/20',
            )}
            style={
              isPopular
                ? { boxShadow: '0 10px 30px var(--emerald-glow)' }
                : undefined
            }
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <main className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section
        className="pt-32 pb-20"
        style={{
          background: 'linear-gradient(180deg, var(--background) 0%, var(--surface) 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--emerald)] mb-3"
          >
            Pricing
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, ease: easeOut }}
            className="text-4xl sm:text-5xl font-bold text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            Flat pricing. No upsells. No surprises.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ease: easeOut }}
            className="mt-4 text-white/50 text-lg leading-relaxed"
          >
            The simple return is genuinely free. Pro is $49 flat, whatever your situation.
          </motion.p>
        </div>
      </section>

      {/* ══ PRICING CARDS ═════════════════════════════════════════════════════ */}
      <section className="py-16" style={{ background: 'var(--surface)' }}>
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3 items-stretch"
          >
            <TierCard
              planName="Simple"
              price="Free"
              period=" · simple returns"
              description="For T4 + basic credits. Students, first-time filers, newcomers with one job."
              features={[
                'AI assessment',
                'OCR slip reading',
                'CRA NETFILE submission',
                '1 tax year',
                'Email support',
              ]}
              ctaLabel="Start for free"
              ctaHref="/signup"
              delay={0}
            />
            <TierCard
              planName="Pro"
              price="$49"
              period=" / return"
              description="Everything — self-employment, RRSP, capital gains, medical, rental, crypto. Flat fee, per return."
              features={[
                'Everything in Simple',
                'Self-employment / T2125',
                'Rental, capital gains, crypto',
                'Joint return optimizer',
                'Retroactive recovery scan',
                'Priority chat support',
              ]}
              isPopular
              ctaLabel="Start my return →"
              ctaHref="/signup"
              delay={0.12}
            />
            <TierCard
              planName="Family"
              price="$149"
              period=" / year"
              description="Up to 5 returns. Joint optimizer included. For families who file together."
              features={[
                'Up to 5 Pro returns',
                'Full family optimizer',
                'Dependant credit transfer',
                'Household dashboard',
                'Priority support',
              ]}
              ctaLabel="Get Family plan"
              ctaHref="/signup"
              delay={0.24}
            />
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURE COMPARISON TABLE ══════════════════════════════════════════ */}
      <section className="py-16" style={{ background: 'var(--background)' }}>
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--emerald)] text-center mb-3"
            >
              Compare
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-bold text-white text-center mb-10"
              style={{ letterSpacing: '-0.015em' }}
            >
              Full feature comparison
            </motion.h2>

            <motion.div
              variants={scaleIn}
              className="overflow-x-auto rounded-2xl"
              style={{ border: '1px solid var(--border)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <th className="py-4 px-6 text-left font-semibold text-white/50">
                      Feature
                    </th>
                    <th className="py-4 px-4 text-center font-semibold text-white/50 w-24">
                      Simple
                    </th>
                    <th
                      className="py-4 px-4 text-center font-semibold w-24"
                      style={{ color: 'var(--emerald)' }}
                    >
                      Pro
                    </th>
                    <th className="py-4 px-4 text-center font-semibold text-white/50 w-24">
                      Family
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map(({ label, simple, pro, family }, i) => (
                    <tr
                      key={label}
                      style={{
                        background:
                          i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <td className="py-3 px-6 text-white/60">{label}</td>
                      <td className="py-3 px-4 text-center">
                        <FeatureCell value={simple} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <FeatureCell value={pro} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <FeatureCell value={family} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16" style={{ background: 'var(--surface)' }}>
        <div className="mx-auto max-w-2xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--emerald)] text-center mb-3"
            >
              FAQ
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl font-bold text-white text-center mb-10"
              style={{ letterSpacing: '-0.015em' }}
            >
              Frequently asked questions
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-3">
              {FAQS.map(({ q, a }) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ BOTTOM CTA ════════════════════════════════════════════════════════ */}
      <section
        className="py-24"
        style={{
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)',
        }}
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold text-white mb-4"
              style={{ letterSpacing: '-0.015em' }}
            >
              Ready to file with confidence?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/50 mb-8">
              Start free — no credit card required. Upgrade only if you need it.
            </motion.p>
            <motion.div
              variants={scaleIn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Button
                asChild
                className="rounded-full h-auto px-8 py-4 text-base font-semibold bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] text-white border-0"
                style={{ boxShadow: '0 10px 30px var(--emerald-glow)' }}
              >
                <Link href="/signup">Start my free assessment →</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
