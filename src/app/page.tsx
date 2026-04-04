import Link from 'next/link';
import {
  Bot,
  ScanLine,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-slate-50">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#1A2744] text-white">
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Emerald glow blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#10B981] opacity-10 blur-3xl"
        />

        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-36 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-[#10B981] mb-8">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            2025 Tax Season — Now Open
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            File your 2025 Canadian taxes
            <br />
            <span className="text-[#10B981]">with AI-powered guidance.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The first tax agent that understands your situation — not just your
            forms. Plain-language explanations, automatic slip reading, and a
            step-by-step filing guide built for real Canadians.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10B981] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#10B981]/25 transition hover:bg-[#059669] hover:shadow-[#059669]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
            >
              Start My Free Tax Assessment
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Estimate My Refund First
            </Link>
          </div>

          {/* Social proof chips */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            {[
              'Free for simple returns',
              'No credit card required',
              'Data stored in Canada',
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
          Everything you need in one place
        </h2>
        <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
          No tax jargon. No confusing forms. Just clear guidance from start to
          filed.
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Bot className="h-7 w-7 text-[#10B981]" />}
            title="AI Assessment"
            description="Answer a few plain-language questions and our AI builds a complete picture of your tax situation — employment income, investments, deductions, and more."
          />
          <FeatureCard
            icon={<ScanLine className="h-7 w-7 text-[#10B981]" />}
            title="Smart OCR Upload"
            description="Photograph or upload your T4, T5, RRSP receipts, and other slips. We extract every number automatically so you never have to type them manually."
          />
          <FeatureCard
            icon={<FileCheck2 className="h-7 w-7 text-[#10B981]" />}
            title="Step-by-Step Filing Guide"
            description="A personalised checklist walks you through exactly what to report, what to claim, and how to submit — whether you file yourself or with an accountant."
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 mb-14">
            From zero to filed in three steps
          </h2>
          <ol className="relative border-l-2 border-[#10B981]/30 space-y-12 ml-4 sm:ml-0 sm:border-l-0 sm:grid sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Tell us about yourself',
                body: 'A short AI-guided interview captures your income sources, life events, and eligible deductions — in under 10 minutes.',
              },
              {
                step: '02',
                title: 'Upload your slips',
                body: 'Snap a photo of your T4 and any other tax documents. OCR technology reads every box accurately.',
              },
              {
                step: '03',
                title: 'Get your personalised guide',
                body: 'Receive a complete, line-by-line filing guide with your calculated refund or balance owing.',
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="pl-8 sm:pl-0">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-white text-xs font-bold sm:static sm:mb-4 sm:inline-flex">
                  {step}
                </span>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── TRUST BANNER ─────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-2xl bg-[#1A2744] text-white p-10 sm:p-14 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-[#10B981]/15 flex items-center justify-center">
              <Lock className="h-8 w-8 text-[#10B981]" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              Your privacy is non-negotiable
            </h2>
            <p className="text-slate-300 leading-relaxed max-w-2xl">
              Your data is encrypted in transit and at rest, and stored
              exclusively on Canadian servers in compliance with PIPEDA. We
              never sell, share, or monetise your personal information. You can
              delete your account and all associated data at any time.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {[
                '256-bit AES encryption',
                'Canadian data residency',
                'PIPEDA compliant',
                'No data selling — ever',
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 text-[#10B981]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p className="font-semibold text-[#1A2744]">TaxAgent.ai</p>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="/privacy" className="hover:text-slate-900 transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition">
              Terms of Service
            </Link>
            <Link
              href="/filing-guide"
              className="hover:text-slate-900 transition"
            >
              Filing Guide
            </Link>
          </nav>
          <p className="text-xs text-center sm:text-right">
            Not affiliated with the Canada Revenue Agency (CRA).
            <br />
            © {new Date().getFullYear()} TaxAgent.ai. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-component ── */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
