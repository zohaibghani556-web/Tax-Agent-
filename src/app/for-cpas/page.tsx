'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Clock, FileWarning, Users } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function ForCPAsPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[var(--navy)] py-24 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-[#10B981] mb-8"
            >
              CPA Portal
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-bold leading-tight"
            >
              Stop doing data entry.
              <br />Start doing tax planning.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              TaxAgent automates client onboarding, slip collection, and data extraction — so your team spends time on
              high-value work, not copy-pasting T4 boxes.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="mailto:cpa@taxagent.ai" className="inline-flex items-center rounded-full bg-[var(--emerald)] px-8 py-4 text-base font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors shadow-lg shadow-[#10B981]/25">
                  Book a demo →
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/pricing" className="inline-flex items-center rounded-full border border-white/30 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors">
                  View pricing
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pain points */}
      <section className="bg-[var(--surface)] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-[var(--text-primary)]">
              Sound familiar?
            </motion.h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3"
          >
            {[
              {
                icon: <Clock className="h-6 w-6 text-[var(--error)]" />,
                title: '3+ hours per return on data entry',
                body: 'Your team manually keys T4, T5, and RRSP data from client-supplied PDFs and photos. Error-prone and demoralizing.',
              },
              {
                icon: <FileWarning className="h-6 w-6 text-[var(--warning)]" />,
                title: 'Clients send incomplete docs',
                body: 'Chasing clients for missing slips extends your busy season. Clients don\'t know what they need to send.',
              },
              {
                icon: <Users className="h-6 w-6 text-[var(--text-secondary)]" />,
                title: 'No scalable client intake',
                body: 'Every client onboards differently — email, paper, or an ad-hoc shared folder. There\'s no consistent process.',
              },
            ].map(({ icon, title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-2xl border border-[var(--border)] bg-white p-8"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  {icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-[var(--text-primary)]">
              How TaxAgent solves it
            </motion.h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-12"
          >
            {[
              {
                step: '01',
                title: 'Clients self-onboard via AI chat',
                body: 'Send clients a link. They chat with the AI assistant which collects their income, life events, and documents — before your team touches anything.',
                highlight: 'Average client onboarding: 12 minutes',
              },
              {
                step: '02',
                title: 'Slips auto-extracted via OCR',
                body: 'Clients photograph their T4, T5, RRSP receipts and any other CRA slips. Every box is extracted, validated, and flagged for review — no manual entry.',
                highlight: '99.1% OCR accuracy on clear documents',
              },
              {
                step: '03',
                title: 'Structured data exports to your software',
                body: 'Export client data as structured JSON or directly to TaxCycle and Cantax formats. Your staff reviews, signs off, and files.',
                highlight: 'Supports TaxCycle, Cantax, and custom CSV',
              },
            ].map(({ step, title, body, highlight }) => (
              <motion.div key={step} variants={fadeUp} className="grid sm:grid-cols-5 gap-6 items-center">
                <div className="sm:col-span-1 flex sm:justify-center">
                  <div className="h-14 w-14 rounded-full bg-[var(--navy)] flex items-center justify-center text-white font-bold text-lg">
                    {step}
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed mb-3">{body}</p>
                  <span className="inline-flex items-center gap-2 text-sm text-[var(--emerald)] font-medium">
                    <Check className="h-4 w-4" />
                    {highlight}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[var(--surface)] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-[var(--text-primary)]">
              Everything your practice needs
            </motion.h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid gap-4 sm:grid-cols-2"
          >
            {[
              { title: 'Client portal', body: 'Each client gets a secure portal to upload documents, answer questions, and track their return status.' },
              { title: 'Bulk workflows', body: 'Manage hundreds of clients simultaneously. Filter by status, missing docs, or review stage.' },
              { title: 'TaxCycle & Cantax export', body: 'One-click structured data export in formats your existing software understands.' },
              { title: 'White-label available', body: 'Run TaxAgent under your firm\'s brand. Custom domain, logo, and colour scheme.' },
              { title: 'API access', body: 'Integrate client data directly into your practice management system via REST API.' },
              { title: 'Dedicated account manager', body: 'A dedicated CSM helps your team onboard and gets you to full utilization fast.' },
            ].map(({ title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-xl border border-[var(--border)] bg-white p-6 flex gap-4"
              >
                <div className="mt-0.5 h-5 w-5 flex-shrink-0">
                  <Check className="h-5 w-5 text-[var(--emerald)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--navy)] py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to modernize your practice?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-300 mb-8 leading-relaxed">
              Book a 30-minute demo and we&apos;ll show you how TaxAgent fits into your existing workflow — no commitment required.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="mailto:cpa@taxagent.ai" className="inline-flex items-center rounded-full bg-[var(--emerald)] px-8 py-4 text-base font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors">
                  Book a demo →
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="mailto:cpa@taxagent.ai" className="inline-flex items-center rounded-full border border-white/30 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors">
                  Email us
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
