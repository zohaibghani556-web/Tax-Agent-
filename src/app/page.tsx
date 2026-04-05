'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bot,
  ScanLine,
  FileCheck2,
  CheckCircle2,
  Check,
} from 'lucide-react';

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardHover = {
  rest: { y: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  hover: { y: -4, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
};

/* ── Reusable MotionButton ── */
function MotionLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}

/* ── Check list item ── */
function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--emerald)]" />
      <span className="text-sm text-[var(--text-secondary)]">{text}</span>
    </li>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[var(--navy)] text-white">
        {/* Animated gradient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 0 }}
        >
          <div
            className="animate-drift absolute"
            style={{
              top: '-10%',
              right: '-5%',
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #10B981 0%, transparent 70%)',
              opacity: 0.12,
            }}
          />
          <div
            className="animate-drift2 absolute"
            style={{
              bottom: '-15%',
              left: '-10%',
              width: 700,
              height: 700,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
              opacity: 0.10,
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 sm:py-36 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {/* Badge */}
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-[#10B981] mb-8">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                2025 Tax Season — Now Open
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              variants={fadeUp}
              custom={0.1}
              className="text-4xl sm:text-6xl font-bold text-white leading-tight tracking-tight"
            >
              File your Canadian taxes with
              <br />
              <span className="text-[#10B981]">AI guidance.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              custom={0.2}
              className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              Answer a few questions. Upload your T4. Get your exact refund — free for simple returns.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              custom={0.3}
              className="mt-10 flex flex-wrap gap-4 justify-center"
            >
              <MotionLink
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-[var(--emerald)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#10B981]/25 hover:bg-[var(--emerald-dark)] transition-colors"
              >
                Start my free assessment →
              </MotionLink>
              <MotionLink
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                See how it works
              </MotionLink>
            </motion.div>

            {/* Hero mockup card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              className="mt-16 mx-auto max-w-sm"
            >
              <div
                className="rounded-2xl p-6 text-left"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">2025 Tax Return</p>
                <p className="text-sm text-slate-300 mb-1">Estimated Refund</p>
                <p className="text-4xl font-bold text-[#10B981]">$3,247.00</p>
                <p className="mt-2 text-xs text-slate-400">Based on your T4 + RRSP contribution</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#10B981]">
                  <CheckCircle2 className="h-4 w-4" />
                  CRA-accurate calculation
                </div>
              </div>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              variants={fadeUp}
              custom={0.5}
              className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-400"
            >
              {[
                '🔒 Data stored in Canada',
                '✓ PIPEDA compliant',
                '✓ Free for simple returns',
                '✓ Not affiliated with CRA',
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════ */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Everything you need to file with confidence
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[var(--text-secondary)] max-w-xl mx-auto">
              No accountant required. No tax jargon. Just clear guidance.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3"
          >
            {[
              {
                icon: <Bot className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'AI Assessment',
                body: 'Chat naturally about your income. The AI figures out your situation — employment, investments, RRSP, everything.',
              },
              {
                icon: <ScanLine className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'OCR Slip Reading',
                body: 'Photograph your T4, T5, or any CRA slip. Every box extracted automatically. You just confirm.',
              },
              {
                icon: <FileCheck2 className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'Personalized Filing Guide',
                body: 'A step-by-step guide with your exact line numbers, amounts, and deadlines. Know exactly what to enter.',
              },
            ].map(({ icon, title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                initial="rest"
                whileHover="hover"
                animate="rest"
              >
                <motion.div
                  variants={cardHover}
                  transition={{ duration: 0.2 }}
                  className="h-full rounded-2xl border border-[var(--border)] bg-white p-8 cursor-default"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--emerald-tint)]">
                    {icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-5">{title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{body}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════ */}
      <section id="how-it-works" className="bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              From zero to filed in under 30 minutes
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-8 sm:grid-cols-3 relative"
          >
            {/* Connector line */}
            <div
              aria-hidden
              className="hidden sm:block absolute top-5 left-[16.67%] right-[16.67%] h-px bg-[var(--border)]"
            />

            {[
              {
                n: '1',
                title: 'Tell us about yourself',
                body: 'A quick AI conversation covers your income, life changes, and deductions.',
              },
              {
                n: '2',
                title: 'Upload your slips',
                body: 'Photograph your T4 and any other documents. OCR reads every number.',
              },
              {
                n: '3',
                title: 'Get your personalized guide',
                body: 'Your exact refund calculated. A line-by-line filing guide ready to use.',
              },
            ].map(({ n, title, body }, i) => (
              <motion.div
                key={n}
                variants={fadeUp}
                custom={i * 0.1}
                className="text-center relative z-10"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--navy)] text-white font-bold text-sm">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-xs mx-auto">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ WHAT YOU GET ══════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] text-center mb-4"
            >
              Built for real Canadian tax situations
            </motion.h2>
            <motion.p variants={fadeUp} className="text-center text-[var(--text-secondary)] mb-14 max-w-xl mx-auto">
              Whether you have a single T4 or a complex portfolio, we&apos;ve got you covered.
            </motion.p>

            <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-x-16 gap-y-4 max-w-3xl mx-auto">
              <ul className="space-y-3">
                {[
                  'Federal + Ontario tax calculated',
                  'RRSP optimization suggestions',
                  'Ontario Trillium Benefit estimate',
                  'Capital gains + dividend income',
                  'Self-employment income support',
                  'New Canadian (newcomer) support',
                ].map((t) => <CheckItem key={t} text={t} />)}
              </ul>
              <ul className="space-y-3">
                {[
                  'What-if scenario engine',
                  '7-credit missed credit finder',
                  'CRA line-by-line guide',
                  'PDF export ready',
                  'Secure Canadian data storage',
                  'Free for simple T4 returns',
                ].map((t) => <CheckItem key={t} text={t} />)}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════ */}
      <section id="pricing" className="bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Simple, transparent pricing
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3 items-stretch"
          >
            {/* Free */}
            <motion.div
              variants={fadeUp}
              custom={0}
              className="rounded-2xl border border-[var(--border)] bg-white p-8 flex flex-col"
            >
              <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Free</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">$0</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">For simple returns with one T4</p>
              <ul className="space-y-2 flex-1 mb-8">
                {['AI chat assessment', 'T4 OCR upload', 'Federal + Ontario calc', 'Filing guide PDF', 'Canadian data storage'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="h-4 w-4 text-[var(--emerald)]" /> {f}
                  </li>
                ))}
              </ul>
              <MotionLink
                href="/signup"
                className="block text-center rounded-full border border-[var(--navy)] text-[var(--navy)] px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Start free
              </MotionLink>
            </motion.div>

            {/* Pro */}
            <motion.div
              variants={fadeUp}
              custom={0.15}
              className="rounded-2xl bg-[var(--navy)] text-white p-8 flex flex-col relative"
              style={{ boxShadow: 'var(--shadow-glow)' }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-[var(--emerald)] px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">Pro</p>
              <p className="text-4xl font-bold text-white">$29<span className="text-lg font-normal text-slate-300">/yr</span></p>
              <p className="text-sm text-slate-300 mt-1 mb-6">For complex returns with multiple slips</p>
              <ul className="space-y-2 flex-1 mb-8">
                {[
                  'Everything in Free',
                  'All slip types (T5, T5008, T3, T4A)',
                  'RRSP optimization',
                  'What-if scenario engine',
                  'Missed credit finder',
                  'Capital gains + dividends',
                  'Self-employment income',
                  'Priority support',
                  'Unlimited amendments',
                  '5-year return history',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-[var(--emerald)]" /> {f}
                  </li>
                ))}
              </ul>
              <MotionLink
                href="/signup"
                className="block text-center rounded-full bg-[var(--emerald)] text-white px-4 py-3 text-sm font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
              >
                Start free trial →
              </MotionLink>
            </motion.div>

            {/* CPA */}
            <motion.div
              variants={fadeUp}
              custom={0.3}
              className="rounded-2xl border-2 border-[var(--emerald)] bg-white p-8 flex flex-col"
            >
              <p className="text-sm font-semibold text-[var(--emerald)] uppercase tracking-wide mb-2">CPA Portal</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">Custom</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">For accounting firms and tax professionals</p>
              <ul className="space-y-2 flex-1 mb-8">
                {[
                  'Client portal + document collection',
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
              <MotionLink
                href="/for-cpas"
                className="block text-center rounded-full bg-[var(--navy)] text-white px-4 py-3 text-sm font-semibold hover:bg-[var(--navy-light)] transition-colors"
              >
                Book a demo
              </MotionLink>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOR CPAs TEASER ═══════════════════════════════════════ */}
      <section className="bg-[var(--navy)] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
                Built for the modern CPA practice
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-slate-300 leading-relaxed">
                Save 3+ hours per return. Automate data entry. Let clients prepare everything before they walk in the door.
              </motion.p>
              <motion.ul variants={fadeUp} className="mt-6 space-y-3">
                {[
                  'Client portal with document collection',
                  'Structured export for TaxCycle and Cantax',
                  'White-label available',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <Check className="h-4 w-4 text-[var(--emerald)]" />
                    {item}
                  </li>
                ))}
              </motion.ul>
              <motion.div variants={fadeUp} className="mt-8">
                <Link
                  href="/for-cpas"
                  className="text-[var(--emerald)] font-semibold hover:underline"
                >
                  Learn more about the CPA portal →
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">CPA Dashboard</p>
                <p className="text-2xl font-bold text-white">32 clients</p>
                <p className="text-sm text-slate-300 mb-6">ready for review</p>
                <div className="space-y-3">
                  {[
                    { label: 'Documents uploaded', pct: 85 },
                    { label: 'Reviews completed', pct: 62 },
                    { label: 'Returns filed', pct: 40 },
                  ].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{label}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--emerald)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ TRUST + SECURITY ══════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Your data is protected by design
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Your personal and financial information is encrypted in transit and at rest, stored exclusively on Canadian servers
              in compliance with PIPEDA. We never sell, share, or monetize your data. Delete your account anytime — your
              data is gone within 30 days.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap justify-center gap-6"
            >
              {[
                { icon: '🇨🇦', label: 'Canadian servers' },
                { icon: '🔒', label: '256-bit encryption' },
                { icon: '✓', label: 'PIPEDA compliant' },
                { icon: '🗑', label: 'Delete anytime' },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--text-secondary)]"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════ */}
      <footer className="bg-[var(--navy)] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid sm:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2">
              <p className="text-xl font-semibold">
                TaxAgent<span className="text-[var(--emerald)]">.ai</span>
              </p>
              <p className="mt-2 text-sm text-slate-400">Canada&apos;s AI tax agent</p>
              <p className="mt-4 text-xs text-slate-500 max-w-xs leading-relaxed">
                Helping Canadians file with confidence since 2025. Not affiliated with the Canada Revenue Agency.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Product</p>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Calculator', 'Filing Guide'].map((l) => (
                  <li key={l}>
                    <Link href={`/${l.toLowerCase().replace(' ', '-')}`} className="text-sm text-slate-300 hover:text-white transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For CPAs */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">For CPAs</p>
              <ul className="space-y-2">
                {['CPA Portal', 'Book a Demo', 'Pricing', 'Integrations'].map((l) => (
                  <li key={l}>
                    <Link href="/for-cpas" className="text-sm text-slate-300 hover:text-white transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Legal</p>
              <ul className="space-y-2">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-slate-300 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-xs text-slate-500">
            © 2025 TaxAgent.ai · Not affiliated with CRA · Built in Canada 🇨🇦
          </div>
        </div>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'TaxAgent.ai',
              url: 'https://taxagent-pink.vercel.app',
              description: 'AI-powered Canadian tax filing assistant for 2025 tax season.',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'TaxAgent.ai',
              url: 'https://taxagent-pink.vercel.app',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Is my data safe?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Your data is encrypted in transit and at rest, stored on Canadian servers, and we are PIPEDA compliant.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How accurate is TaxAgent.ai?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'All calculations use deterministic TypeScript against official CRA rates and thresholds for 2025, cross-validated against CRA examples.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What slips are supported?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'We support T4, T5, T5008, T3, T4A, and T2202 slips with automatic OCR reading.',
                  },
                },
              ],
            },
          ]),
        }}
      />
    </main>
  );
}
