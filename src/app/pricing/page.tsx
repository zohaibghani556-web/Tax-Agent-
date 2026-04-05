'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const FEATURES: { label: string; free: boolean | string; pro: boolean | string; cpa: boolean | string }[] = [
  { label: 'AI chat assessment', free: true, pro: true, cpa: true },
  { label: 'T4 OCR upload', free: true, pro: true, cpa: true },
  { label: 'Federal + Ontario tax calc', free: true, pro: true, cpa: true },
  { label: 'Filing guide PDF', free: true, pro: true, cpa: true },
  { label: 'Canadian data storage', free: true, pro: true, cpa: true },
  { label: 'All slip types (T5, T5008, T3, T4A, T2202)', free: false, pro: true, cpa: true },
  { label: 'RRSP optimization', free: false, pro: true, cpa: true },
  { label: 'What-if scenario engine', free: false, pro: true, cpa: true },
  { label: 'Missed credit finder', free: false, pro: true, cpa: true },
  { label: 'Capital gains + dividends', free: false, pro: true, cpa: true },
  { label: 'Self-employment income', free: false, pro: true, cpa: true },
  { label: 'Unlimited amendments', free: false, pro: true, cpa: true },
  { label: 'Client portal', free: false, pro: false, cpa: true },
  { label: 'Bulk filing workflows', free: false, pro: false, cpa: true },
  { label: 'TaxCycle / Cantax export', free: false, pro: false, cpa: true },
  { label: 'White-label', free: false, pro: false, cpa: true },
  { label: 'API access', free: false, pro: false, cpa: true },
];

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
    a: 'Free: T4. Pro: T4, T5, T5008, T3, T4A, T2202, and RRSP contribution receipts — all with automatic OCR reading.',
  },
  {
    q: 'Can I use it for my small business?',
    a: 'Yes — Pro includes self-employment income (T2125 equivalent), business expenses, and HST/GST estimates for Ontario-based sole proprietors.',
  },
  {
    q: 'What if I have a complex return?',
    a: 'Pro handles multi-slip, multi-income returns including employment, investments, rental income, and self-employment. For corporate returns, the CPA Portal provides structured exports for professional tax software.',
  },
  {
    q: 'How is this different from TurboTax?',
    a: 'TaxAgent uses a conversational AI to understand your situation first, then calculates — not the other way around. We also support OCR slip reading, missing credit detection, and a CPA handoff workflow that TurboTax does not offer.',
  },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-[var(--emerald)]" />;
  if (value === false) return <span className="text-slate-300 text-lg">—</span>;
  return <span className="text-sm text-[var(--text-secondary)]">{value}</span>;
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-medium text-[var(--text-primary)] hover:bg-slate-50 transition-colors"
      >
        {q}
        {open ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[var(--surface)] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)]"
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-[var(--text-secondary)] text-lg"
          >
            Free for simple returns. Upgrade when you need more.
          </motion.p>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-white p-1"
          >
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!annual ? 'bg-[var(--navy)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${annual ? 'bg-[var(--navy)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Annual
              <span className="text-xs bg-[var(--emerald)] text-white px-1.5 py-0.5 rounded-full">Save 20%</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3 items-stretch"
          >
            {/* Free */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-[var(--border)] bg-white p-8 flex flex-col">
              <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Free</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">$0</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">For simple T4 returns</p>
              <ul className="space-y-2 flex-1 mb-8">
                {['AI chat assessment', 'T4 OCR upload', 'Federal + Ontario calc', 'Filing guide PDF', 'Canadian data storage'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="h-4 w-4 text-[var(--emerald)]" /> {f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/signup" className="block text-center rounded-full border border-[var(--navy)] text-[var(--navy)] px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Start free
                </Link>
              </motion.div>
            </motion.div>

            {/* Pro */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-[var(--navy)] text-white p-8 flex flex-col relative"
              style={{ boxShadow: 'var(--shadow-glow)' }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-[var(--emerald)] px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">Pro</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-white">{annual ? '$29' : '$39'}</p>
                <p className="text-slate-300 text-sm">{annual ? '/yr' : '/mo'}</p>
                {annual && <p className="text-slate-400 text-sm line-through">$39/mo</p>}
              </div>
              <p className="text-sm text-slate-300 mt-1 mb-6">For complex returns</p>
              <ul className="space-y-2 flex-1 mb-8">
                {[
                  'Everything in Free',
                  'All slip types (T5, T5008, T3, T4A)',
                  'RRSP optimization',
                  'What-if scenario engine',
                  'Missed credit finder',
                  'Capital gains + dividends',
                  'Self-employment income',
                  'Unlimited amendments',
                  'Priority support',
                  '5-year return history',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-[var(--emerald)]" /> {f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/signup" className="block text-center rounded-full bg-[var(--emerald)] text-white px-4 py-3 text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors">
                  Start free trial →
                </Link>
              </motion.div>
            </motion.div>

            {/* CPA */}
            <motion.div variants={fadeUp} className="rounded-2xl border-2 border-[var(--emerald)] bg-white p-8 flex flex-col">
              <p className="text-sm font-semibold text-[var(--emerald)] uppercase tracking-wide mb-2">CPA Portal</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">Custom</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">For firms and professionals</p>
              <ul className="space-y-2 flex-1 mb-8">
                {[
                  'Everything in Pro',
                  'Client portal',
                  'Bulk filing workflows',
                  'TaxCycle + Cantax export',
                  'White-label available',
                  'API access',
                  'Dedicated account manager',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="h-4 w-4 text-[var(--emerald)]" /> {f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/for-cpas" className="block text-center rounded-full bg-[var(--navy)] text-white px-4 py-3 text-sm font-semibold hover:bg-[var(--navy-light)] transition-colors">
                  Book a demo
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-[var(--surface)] py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-4 px-6 text-left font-semibold text-[var(--text-primary)]">Feature</th>
                  <th className="py-4 px-4 text-center font-semibold text-[var(--text-secondary)]">Free</th>
                  <th className="py-4 px-4 text-center font-semibold text-[var(--navy)]">Pro</th>
                  <th className="py-4 px-4 text-center font-semibold text-[var(--emerald)]">CPA</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(({ label, free, pro, cpa }, i) => (
                  <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-6 text-[var(--text-secondary)]">{label}</td>
                    <td className="py-3 px-4 text-center"><FeatureCell value={free} /></td>
                    <td className="py-3 px-4 text-center"><FeatureCell value={pro} /></td>
                    <td className="py-3 px-4 text-center"><FeatureCell value={cpa} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => <FAQ key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[var(--navy)] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to file with confidence?</h2>
          <p className="text-slate-300 mb-8">Start free — no credit card required. Upgrade only if you need it.</p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
            <Link href="/signup" className="inline-flex items-center rounded-full bg-[var(--emerald)] px-8 py-4 text-base font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors shadow-lg shadow-[#10B981]/25">
              Start my free assessment →
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
