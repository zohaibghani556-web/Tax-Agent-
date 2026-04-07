'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  motion,
  useInView,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Bot,
  ScanLine,
  FileCheck2,
  CheckCircle2,
  Check,
  Shield,
  Lock,
  Trash2,
  Flag,
} from 'lucide-react';
import { AnimatedHeroBackground } from '@/components/ui/animated-hero-background';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { CountUp } from '@/components/animations/CountUp';

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

const itemStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const listItem = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: easeOut } },
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
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 + i * 0.07, ease: easeOut }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
      <span className="block text-[#10B981]">
        {line2.map((word, i) => (
          <motion.span
            key={word + i}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
   FEATURE CARD WITH HOVER GLOW
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
      className="group h-full rounded-2xl p-8 cursor-default"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <motion.div
        whileHover={{ rotate: 8, scale: 1.08 }}
        transition={{ duration: 0.2 }}
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/15 ring-1 ring-[#10B981]/20"
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-semibold text-white mt-5">{title}</h3>
      <p className="mt-2 text-sm text-white/60 leading-relaxed">{body}</p>
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
    primary: 'bg-[#10B981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/25',
    secondary: 'bg-white/8 hover:bg-white/12 text-white border border-white/10',
    outline: 'bg-[#1A2744] hover:bg-[#243358] text-white',
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981] px-3 py-1 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Most Popular
          </span>
        </div>
      )}

      <div
        className="flex flex-col flex-1 rounded-2xl p-8"
        style={{
          background: isPopular ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
          border: isPopular ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: isPopular
            ? '0 0 60px rgba(16,185,129,0.12), 0 20px 40px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Floating glow for popular card */}
        {isPopular && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              boxShadow: '0 0 60px rgba(16,185,129,0.15)',
              borderRadius: 16,
            }}
          />
        )}

        <p className="text-sm font-semibold uppercase tracking-widest mb-3"
          style={{ color: isPopular ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
          {planName}
        </p>
        <div className="flex items-end gap-1 mb-1">
          <span className="text-4xl font-bold text-white">{price}</span>
          {period && <span className="text-base text-white/40 mb-1">{period}</span>}
        </div>
        <p className="text-sm text-white/50 mb-7">{description}</p>

        <div className="h-px mb-6" style={{
          background: isPopular ? 'linear-gradient(90deg, rgba(16,185,129,0.5), transparent)' : 'rgba(255,255,255,0.07)'
        }} />

        <ul className="space-y-2.5 flex-1 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
              <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-[#10B981]/15">
                <Check className="h-3 w-3 text-[#10B981]" />
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
   ANIMATED PROGRESS BAR
───────────────────────────────────────────────────────────────────────────── */

function AnimatedProgressBar({ label, pct }: { label: string; pct: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref}>
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>{label}</span>
        <span>
          <CountUp end={pct} suffix="%" />
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#10B981]"
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${pct}%` : 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: easeOut }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0a1020' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <AnimatedHeroBackground minHeight="calc(100vh - 0px)">
        <div className="mx-auto max-w-4xl px-6 pt-32 pb-24 sm:pt-44 sm:pb-32 text-center">

          {/* 2025 badge — pulse glow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mb-8 inline-block"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-[#10B981]"
              style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}
            >
              <span className="relative flex h-2 w-2">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-[#10B981]"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
              </span>
              2025 Tax Season — Now Open
            </span>
          </motion.div>

          {/* Word-by-word headline */}
          <AnimatedHeadline />

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: easeOut }}
            className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed"
          >
            Answer a few questions. Upload your T4. Get your exact refund — free for simple returns.
          </motion.p>

          {/* CTA buttons with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9, ease: easeOut }}
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <MagneticButton radius={120} strength={0.35}>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-[#10B981] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[#10B981]/30 hover:bg-[#059669] transition-colors"
              >
                Start my free assessment →
              </Link>
            </MagneticButton>
            <MagneticButton radius={120} strength={0.3}>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                See how it works
              </Link>
            </MagneticButton>
          </motion.div>

          {/* Refund card — floating with shine + CountUp */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1.0, ease: easeOut }}
            className="mt-16 mx-auto max-w-sm"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="group relative rounded-2xl p-6 text-left overflow-hidden cursor-default"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ x: '-100%', opacity: 0 }}
                whileHover={{ x: '200%', opacity: 1 }}
                transition={{ duration: 0.6 }}
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
                }}
              />

              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">2025 Tax Return</p>
              <p className="text-sm text-white/60 mb-1">Estimated Refund</p>
              <p className="text-4xl font-bold text-[#10B981]">
                $<CountUp end={3247} duration={2} decimals={2} suffix="" immediate />
              </p>
              <p className="mt-2 text-xs text-white/40">Based on your T4 + RRSP contribution</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#10B981]">
                <CheckCircle2 className="h-4 w-4" />
                CRA-accurate calculation
              </div>
            </motion.div>
          </motion.div>

          {/* Trust bar — staggered slide-in */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            transition={{ delayChildren: 1.2 }}
            className="mt-10 flex flex-wrap justify-center gap-5 text-sm text-white/40"
          >
            {[
              '🔒 Data stored in Canada',
              '✓ PIPEDA compliant',
              '✓ Free for simple returns',
              '✓ Not affiliated with CRA',
            ].map((item, i) => (
              <motion.span
                key={item}
                variants={fadeUp}
                custom={i * 0.08}
              >
                {item}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </AnimatedHeroBackground>

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <section
        id="features"
        className="py-28"
        style={{ background: 'linear-gradient(180deg, #0a1020 0%, #0d1828 100%)' }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
              Features
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
              Everything you need to file with confidence
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/50 max-w-xl mx-auto">
              No accountant required. No tax jargon. Just clear guidance.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-5 sm:grid-cols-3"
          >
            {[
              {
                icon: <Bot className="h-6 w-6 text-[#10B981]" />,
                title: 'AI Assessment',
                body: 'Chat naturally about your income. The AI figures out your situation — employment, investments, RRSP, everything.',
                delay: 0,
              },
              {
                icon: <ScanLine className="h-6 w-6 text-[#10B981]" />,
                title: 'OCR Slip Reading',
                body: 'Photograph your T4, T5, or any CRA slip. Every box extracted automatically. You just confirm.',
                delay: 0.1,
              },
              {
                icon: <FileCheck2 className="h-6 w-6 text-[#10B981]" />,
                title: 'Personalized Filing Guide',
                body: 'A step-by-step guide with your exact line numbers, amounts, and deadlines. Know exactly what to enter.',
                delay: 0.2,
              },
            ].map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="py-28 relative"
        style={{
          background: '#0d1828',
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
              From zero to filed in under 30 minutes
            </motion.h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3 relative">
            {/* Animated connector line */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: easeOut, delay: 0.4 }}
              aria-hidden
              className="hidden sm:block absolute top-5 left-[16.67%] right-[16.67%] h-px origin-left"
              style={{
                background: 'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.2) 100%)',
              }}
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
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 22,
                  delay: 0.2 + i * 0.15,
                }}
                className="text-center relative z-10"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full font-bold text-sm text-white"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                  }}
                >
                  {n}
                </motion.div>
                <h3 className="mt-5 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/50 max-w-xs mx-auto">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHAT YOU GET ══════════════════════════════════════════════════════ */}
      <section
        className="py-28"
        style={{ background: 'linear-gradient(180deg, #0d1828 0%, #0a1020 100%)' }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
              Coverage
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
              Built for real Canadian tax situations
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/50 max-w-xl mx-auto">
              Whether you have a single T4 or a complex portfolio, we&apos;ve got you covered.
            </motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-x-16 gap-y-0 max-w-3xl mx-auto">
            {[
              [
                'Federal + Ontario tax calculated',
                'RRSP optimization suggestions',
                'Ontario Trillium Benefit estimate',
                'Capital gains + dividend income',
                'Self-employment income support',
                'New Canadian (newcomer) support',
              ],
              [
                'What-if scenario engine',
                '7-credit missed credit finder',
                'CRA line-by-line guide',
                'PDF export ready',
                'Secure Canadian data storage',
                'Free for simple T4 returns',
              ],
            ].map((col, colIdx) => (
              <motion.ul
                key={colIdx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={itemStagger}
                className="space-y-0"
              >
                {col.map((text) => (
                  <motion.li
                    key={text}
                    variants={listItem}
                    className="flex items-center gap-3 py-3 border-b border-white/5"
                  >
                    <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-[#10B981]/15">
                      <Check className="h-3 w-3 text-[#10B981]" />
                    </span>
                    <span className="text-sm text-white/70">{text}</span>
                  </motion.li>
                ))}
              </motion.ul>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-28"
        style={{ background: '#0a1020' }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
              Pricing
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
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
            <PricingCard
              planName="Free"
              price="$0"
              period=""
              description="For simple returns with one T4"
              features={[
                'AI chat assessment',
                'T4 OCR upload',
                'Federal + Ontario calc',
                'Filing guide PDF',
                'Canadian data storage',
              ]}
              ctaLabel="Start free"
              ctaHref="/signup"
              ctaVariant="secondary"
              delay={0}
            />
            <PricingCard
              planName="Pro"
              price="$29"
              period="/yr"
              description="For complex returns with multiple slips"
              features={[
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
              ]}
              isPopular
              ctaLabel="Start free trial →"
              ctaHref="/signup"
              ctaVariant="primary"
              delay={0.12}
            />
            <PricingCard
              planName="CPA Portal"
              price="Custom"
              period=""
              description="For accounting firms and tax professionals"
              features={[
                'Client portal + document collection',
                'Bulk filing workflows',
                'TaxCycle + Cantax export',
                'White-label available',
                'API access',
                'Dedicated account manager',
              ]}
              ctaLabel="Book a demo"
              ctaHref="/for-cpas"
              ctaVariant="outline"
              delay={0.24}
            />
          </motion.div>
        </div>
      </section>

      {/* ══ FOR CPAs TEASER ═══════════════════════════════════════════════════ */}
      <section
        className="py-28"
        style={{ background: '#0d1828' }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
                For CPAs
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
                Built for the modern CPA practice
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-white/60 leading-relaxed">
                Save 3+ hours per return. Automate data entry. Let clients prepare everything before they walk in the door.
              </motion.p>
              <motion.ul variants={fadeUp} className="mt-6 space-y-3">
                {[
                  'Client portal with document collection',
                  'Structured export for TaxCycle and Cantax',
                  'White-label available',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-[#10B981]/15">
                      <Check className="h-3 w-3 text-[#10B981]" />
                    </span>
                    {item}
                  </li>
                ))}
              </motion.ul>
              <motion.div variants={fadeUp} className="mt-8">
                <Link
                  href="/for-cpas"
                  className="text-[#10B981] font-semibold hover:underline text-sm"
                >
                  Learn more about the CPA portal →
                </Link>
              </motion.div>
            </motion.div>

            {/* CPA Dashboard card — slide in from right with depth */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: easeOut }}
            >
              <div
                className="rounded-2xl p-7 relative overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}
              >
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">CPA Dashboard</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={32} duration={1.5} />
                  </p>
                  <span className="text-white/60 text-sm">clients</span>
                </div>
                <p className="text-sm text-white/50 mb-8">ready for review</p>
                <div className="space-y-5">
                  {[
                    { label: 'Documents uploaded', pct: 85 },
                    { label: 'Reviews completed', pct: 62 },
                    { label: 'Returns filed', pct: 40 },
                  ].map(({ label, pct }) => (
                    <AnimatedProgressBar key={label} label={label} pct={pct} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ TRUST + SECURITY ══════════════════════════════════════════════════ */}
      <section
        className="py-28"
        style={{ background: 'linear-gradient(180deg, #0d1828 0%, #0a1020 100%)' }}
      >
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-3">
              Security
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white">
              Your data is protected by design
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/50 max-w-2xl mx-auto leading-relaxed">
              Your personal and financial information is encrypted in transit and at rest, stored exclusively on Canadian servers
              in compliance with PIPEDA. We never sell, share, or monetize your data. Delete your account anytime — your
              data is gone within 30 days.
            </motion.p>
            <motion.div
              variants={stagger}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              {[
                { icon: <Flag className="h-4 w-4" />, label: 'Canadian servers' },
                { icon: <Lock className="h-4 w-4" />, label: '256-bit encryption' },
                { icon: <Shield className="h-4 w-4" />, label: 'PIPEDA compliant' },
                { icon: <Trash2 className="h-4 w-4" />, label: 'Delete anytime' },
              ].map(({ icon, label }, i) => (
                <motion.div
                  key={label}
                  variants={scaleIn}
                  custom={i * 0.08}
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5 rounded-full px-5 py-3 text-sm text-white/70"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-[#10B981]">{icon}</span>
                  <span>{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#060d18' }} className="text-white border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid sm:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2">
              <p className="text-xl font-semibold">
                TaxAgent<span className="text-[#10B981]">.ai</span>
              </p>
              <p className="mt-2 text-sm text-white/40">Canada&apos;s AI tax agent</p>
              <p className="mt-4 text-xs text-white/25 max-w-xs leading-relaxed">
                Helping Canadians file with confidence since 2025. Not affiliated with the Canada Revenue Agency.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Product</p>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Calculator', 'Filing Guide'].map((l) => (
                  <li key={l}>
                    <Link href={`/${l.toLowerCase().replace(' ', '-')}`} className="text-sm text-white/50 hover:text-white transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For CPAs */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">For CPAs</p>
              <ul className="space-y-2">
                {['CPA Portal', 'Book a Demo', 'Pricing', 'Integrations'].map((l) => (
                  <li key={l}>
                    <Link href="/for-cpas" className="text-sm text-white/50 hover:text-white transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Legal</p>
              <ul className="space-y-2">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 text-center text-xs text-white/20">
            © 2025 TaxAgent.ai · Not affiliated with CRA · Built in Canada 🇨🇦
          </div>
        </div>
      </footer>
    </div>
  );
}
