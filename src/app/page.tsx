'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Bot,
  ScanLine,
  FileCheck2,
  Check,
  Shield,
  MessageSquare,
  Upload,
  Calculator,
  Users,
  RotateCcw,
} from 'lucide-react';
import { AnimatedHeroBackground } from '@/components/ui/animated-hero-background';
import { MagneticButton } from '@/components/ui/magnetic-button';

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED ANIMATION CONFIG
───────────────────────────────────────────────────────────────────────────── */

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: easeOut },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay, ease: easeOut },
  }),
};

/* ─────────────────────────────────────────────────────────────────────────────
   WORD-BY-WORD ANIMATED HEADLINE
───────────────────────────────────────────────────────────────────────────── */

function AnimatedHeadline() {
  const prefersReduced = useReducedMotion();
  const line1 = ['File', 'your', 'Canadian', 'taxes', 'with'];
  const line2 = ['AI', 'guidance.'];

  return (
    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
      <span className="block">
        {line1.map((word, i) => (
          <motion.span
            key={word + i}
            initial={prefersReduced ? {} : { y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 + i * 0.07, ease: easeOut }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
      <span className="block text-[var(--emerald)]">
        {line2.map((word, i) => (
          <motion.span
            key={word + i}
            initial={prefersReduced ? {} : { y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.45, delay: 0.55 + i * 0.09, ease: easeOut }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
    </h1>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE ESTIMATOR CARD — hero right column, slider-based instant preview
───────────────────────────────────────────────────────────────────────────── */

function LiveEstimatorCard() {
  const [income, setIncome] = useState(62000);
  const [rrsp, setRrsp] = useState(2400);
  // Quick Ontario estimate for display only — not used for CRA filing
  // Approximates combined federal + Ontario net tax minus basic personal amounts
  const tax = Math.max(0, income * 0.205 - rrsp * 0.205 - 2355);
  const withheld = income * 0.22;
  const refund = Math.max(0, Math.round(withheld - tax));

  return (
    <div className="relative">
      {/* Radial emerald glow behind card */}
      <div
        className="absolute -inset-8 rounded-[32px] pointer-events-none"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse at center, var(--emerald-glow) 0%, transparent 70%)',
        }}
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-[12px] font-semibold tracking-[0.15em] uppercase text-emerald-400">
            Instant estimator
          </span>
          <span className="text-[11px] text-white/40 font-mono">2025 · ON</span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/60">Employment income</span>
              <span className="text-white font-mono tabular-nums">
                ${income.toLocaleString('en-CA')}
              </span>
            </div>
            <input
              type="range"
              min="20000"
              max="150000"
              step="1000"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              className="w-full accent-emerald-500"
              aria-label="Employment income"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/60">RRSP contributions</span>
              <span className="text-white font-mono tabular-nums">
                ${rrsp.toLocaleString('en-CA')}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20000"
              step="100"
              value={rrsp}
              onChange={(e) => setRrsp(Number(e.target.value))}
              className="w-full accent-emerald-500"
              aria-label="RRSP contributions"
            />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="text-[12px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-1">
            Estimated refund
          </div>
          <div
            className="text-5xl font-bold text-emerald-400 tabular-nums"
            style={{ letterSpacing: '-0.02em' }}
          >
            ${refund.toLocaleString('en-CA')}
          </div>
          <p className="text-xs text-white/40 mt-2">
            Based on federal + Ontario 2025 rates. CRA-accurate when you file.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="block w-full mt-5 text-center font-semibold py-3.5 rounded-full text-white bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] transition-colors"
          style={{ boxShadow: '0 10px 30px var(--emerald-glow)' }}
        >
          Start my free assessment →
        </Link>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE CARD WITH HOVER GLOW + GROUP-HOVER ICON ROTATION
───────────────────────────────────────────────────────────────────────────── */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  delay?: number;
}

function FeatureCard({ icon, title, body, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      variants={scaleIn}
      custom={delay}
      whileHover={{
        y: -6,
        boxShadow: '0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.3)',
      }}
      transition={{ duration: 0.25 }}
      className="group h-full rounded-2xl p-7 cursor-default"
      style={{
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20 transition-transform duration-200 group-hover:scale-[1.08] group-hover:rotate-[8deg]">
        {icon}
      </div>
      <h3
        className="text-[19px] font-bold text-white"
        style={{ letterSpacing: '-0.01em' }}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">{body}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3D TILT PRICING CARD
───────────────────────────────────────────────────────────────────────────── */

interface PricingCardProps {
  planName: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaVariant?: 'primary' | 'secondary' | 'outline';
  delay?: number;
}

function PricingCard({
  planName,
  price,
  period,
  description,
  features,
  isPopular = false,
  ctaLabel,
  ctaHref,
  ctaVariant = 'secondary',
  delay = 0,
}: PricingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 240, damping: 28 };
  const rotateX = useTransform(useSpring(mouseY, springConfig), [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(useSpring(mouseX, springConfig), [-0.5, 0.5], ['-10deg', '10deg']);
  const scale = useSpring(1, { stiffness: 300, damping: 25 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || prefersReduced) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    scale.set(1.02);
  }
  function onMouseLeave() {
    mouseX.set(0); mouseY.set(0); scale.set(1);
  }

  const ctaBg = {
    primary: 'bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] text-white shadow-lg shadow-emerald-500/25',
    secondary: 'bg-white/8 hover:bg-white/12 text-white border border-white/10',
    outline: 'bg-[var(--navy-light)] hover:bg-[var(--surface-elevated)] text-white',
  }[ctaVariant];

  return (
    <motion.div
      variants={scaleIn}
      custom={delay}
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        rotateX: prefersReduced ? 0 : rotateX,
        rotateY: prefersReduced ? 0 : rotateY,
        scale,
        transformStyle: 'preserve-3d',
        perspective: '1200px',
      }}
      className="relative w-full cursor-default select-none flex flex-col"
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--emerald)] px-3 py-1 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Most popular
          </span>
        </div>
      )}

      <div
        className="flex flex-col flex-1 rounded-2xl p-8"
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
        {/* Pulse glow for popular card */}
        {isPopular && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 60px rgba(16,185,129,0.15)', borderRadius: 16 }}
          />
        )}

        <p
          className="text-sm font-semibold uppercase tracking-[0.15em] mb-3"
          style={{ color: isPopular ? 'var(--emerald)' : 'rgba(255,255,255,0.5)' }}
        >
          {planName}
        </p>
        <div className="flex items-end gap-1 mb-1">
          <span className="text-4xl font-bold text-white tabular-nums">{price}</span>
          {period && <span className="text-base text-white/40 mb-1">{period}</span>}
        </div>
        <p className="text-sm text-white/50 mb-7">{description}</p>

        <div
          className="h-px mb-6"
          style={{
            background: isPopular
              ? 'linear-gradient(90deg, rgba(16,185,129,0.5), transparent)'
              : 'rgba(255,255,255,0.07)',
          }}
        />

        <ul className="space-y-2.5 flex-1 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
              <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-emerald-500/15">
                <Check className="h-3 w-3 text-[var(--emerald)]" />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <Link
          href={ctaHref}
          className={`block text-center rounded-full px-4 py-3 text-sm font-semibold transition-all duration-200 ${ctaBg}`}
        >
          {ctaLabel}
        </Link>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <AnimatedHeroBackground>
        <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-24 sm:pt-40 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — headline, CTAs, trust bar */}
          <div>
            {/* Eyebrow pill */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="mb-6 inline-block"
            >
              <span
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <motion.span
                    className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                2025 Tax Season · Ontario, Canada
              </span>
            </motion.div>

            {/* Word-by-word headline */}
            <AnimatedHeadline />

            {/* Subcopy */}
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.75, ease: easeOut }}
              className="mt-6 text-[17px] text-white/60 leading-relaxed max-w-xl mb-8"
            >
              Answer a few questions. Upload your T4. Get your exact refund — free for simple
              returns, no accountant required.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9, ease: easeOut }}
              className="flex flex-wrap items-center gap-3 mb-8"
            >
              <MagneticButton radius={120} strength={0.35}>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--emerald)] px-7 py-4 text-base font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
                  style={{ boxShadow: '0 10px 30px var(--emerald-glow)' }}
                >
                  Start my free assessment →
                </Link>
              </MagneticButton>
              <MagneticButton radius={120} strength={0.3}>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  See how it works
                </Link>
              </MagneticButton>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              transition={{ delayChildren: 1.2 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/50"
            >
              {[
                '🔒 Data stored in Canada',
                '✓ PIPEDA compliant',
                '✓ Free for simple returns',
                '✓ Not affiliated with CRA',
              ].map((item, i) => (
                <motion.span key={item} variants={fadeUp} custom={i * 0.08}>
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Right — live estimator card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.6, ease: easeOut }}
            className="relative"
          >
            <LiveEstimatorCard />
          </motion.div>
        </div>
      </AnimatedHeroBackground>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative py-28"
        style={{ background: 'var(--background)' }}
      >
        {/* Subtle 60px grid overlay at 3% opacity */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p
              variants={fadeUp}
              className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)] mb-3"
            >
              How it works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-white font-bold"
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              From zero to filed in 15 minutes.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                n: '01',
                icon: <MessageSquare className="w-5 h-5" />,
                title: 'Answer a few questions',
                body: '5 minutes. A conversation — not a 40-page questionnaire. We figure out which credits apply to you.',
              },
              {
                n: '02',
                icon: <Upload className="w-5 h-5" />,
                title: 'Upload your slips',
                body: 'Snap a photo of your T4. OCR extracts every box. Confirm and move on.',
              },
              {
                n: '03',
                icon: <FileCheck2 className="w-5 h-5" />,
                title: 'Review and file',
                body: "See your refund, line by line. File direct with CRA when you're ready. Free for simple returns.",
              },
            ].map(({ n, icon, title, body }) => (
              <motion.div
                key={n}
                variants={scaleIn}
                className="relative rounded-2xl p-7"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <div className="text-[13px] font-mono text-emerald-400/80 tracking-widest mb-4">
                  {n}
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4">
                  {icon}
                </div>
                <h3 className="text-white font-bold text-[18px] mb-2">{title}</h3>
                <p className="text-white/55 text-[14px] leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <section
        id="features"
        className="py-28"
        style={{ background: 'var(--surface)' }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-14 max-w-2xl mx-auto"
          >
            <motion.p
              variants={fadeUp}
              className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)] mb-3"
            >
              Features
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-white font-bold mb-4"
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Tax filing that feels like a conversation.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[16px] text-white/55 leading-relaxed">
              Built for Ontarians who&apos;ve never filed, just arrived, or are tired of paying
              $120 to retype their T4.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                icon: <ScanLine className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'OCR slip reading',
                body: 'Photograph your T4, T5, or any CRA slip. Every box extracted automatically. You just confirm.',
                delay: 0,
              },
              {
                icon: <Bot className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'AI assessment',
                body: 'A short chat figures out your credits — newcomer, tuition, medical, moving. No forms to decode.',
                delay: 0.06,
              },
              {
                icon: <Calculator className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'CRA-accurate math',
                body: 'Every dollar runs through a deterministic tax engine. Federal + Ontario, 2025 rates, audit-ready.',
                delay: 0.12,
              },
              {
                icon: <Users className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'Joint optimizer',
                body: 'Split RRSP, pension, medical, and tuition transfers between partners to minimize household tax.',
                delay: 0.18,
              },
              {
                icon: <RotateCcw className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'Retroactive recovery',
                body: 'Scan the last 10 years of returns for missed credits. Many Ontarians recover $1,500+.',
                delay: 0.24,
              },
              {
                icon: <Shield className="h-6 w-6 text-[var(--emerald)]" />,
                title: 'Canadian-grade privacy',
                body: 'Data stored in Canada. PIPEDA compliant. SIN encrypted at rest. Never shared, ever.',
                delay: 0.3,
              },
            ].map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-28"
        style={{ background: 'var(--background)' }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-14 max-w-2xl mx-auto"
          >
            <motion.p
              variants={fadeUp}
              className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)] mb-3"
            >
              Pricing
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-white font-bold mb-4"
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Flat pricing. No upsells. No surprises.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[16px] text-white/55 leading-relaxed">
              The simple return is genuinely free. Pro is $49 flat, whatever your situation.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3 items-stretch"
          >
            <PricingCard
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
              ctaVariant="secondary"
              delay={0}
            />
            <PricingCard
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
              ctaVariant="primary"
              delay={0.12}
            />
            <PricingCard
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
              ctaVariant="secondary"
              delay={0.24}
            />
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer
        className="border-t border-white/5 pt-16 pb-10"
        style={{ background: 'var(--background)' }}
      >
        <div className="mx-auto max-w-6xl px-6">
          {/* 4-column grid */}
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl border border-emerald-500/30 flex items-center justify-center relative"
                  style={{ background: 'var(--navy)' }}
                >
                  <span
                    className="text-white font-bold text-lg leading-none"
                    style={{ letterSpacing: '-0.04em' }}
                  >
                    T
                  </span>
                  <span
                    className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500"
                    style={{ top: '18px', right: '7px' }}
                  />
                </div>
                <span
                  className="font-semibold text-[16px]"
                  style={{ letterSpacing: '-0.025em' }}
                >
                  <span className="text-white">TaxAgent</span>
                  <span className="text-emerald-500">.ai</span>
                </span>
              </div>
              <p className="text-white/45 text-[13px] leading-relaxed max-w-xs">
                AI-guided Canadian personal tax filing. Built in Toronto for Ontario residents.
              </p>
            </div>

            {/* Product */}
            <div>
              <div className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)] mb-4">
                Product
              </div>
              <ul className="space-y-2.5">
                {[
                  { label: 'How it works', href: '/#how-it-works' },
                  { label: 'Features', href: '/#features' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'For CPAs', href: '/for-cpas' },
                  { label: 'Estimate', href: '/estimate' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/60 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <div className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)] mb-4">
                Support
              </div>
              <ul className="space-y-2.5">
                {[
                  { label: 'Help center', href: '#' },
                  { label: 'Contact', href: '#' },
                  { label: 'Status', href: '#' },
                  { label: 'Security', href: '#' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/60 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)] mb-4">
                Legal
              </div>
              <ul className="space-y-2.5">
                {[
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Terms', href: '/terms' },
                  { label: 'PIPEDA', href: '#' },
                  { label: 'CRA registration', href: '#' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/60 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trust strip */}
          <div className="pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[12px] text-white/35">
              © 2026 TaxAgent.ai · Not affiliated with CRA · Data stored in Canada
            </div>
            <div className="flex items-center gap-5 text-[12px] text-white/45">
              <span className="flex items-center gap-1.5">🔒 PIPEDA compliant</span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                SOC 2 in progress
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
