'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle, Clock, FileWarning, Loader2, Users } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function CPAContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, type: 'CPA inquiry' }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-12 w-12 text-[var(--emerald)]" />
        <p className="text-xl font-semibold text-white">Message sent!</p>
        <p className="text-slate-400 text-center max-w-sm">
          We&apos;ll be in touch within 24 hours to schedule a call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto text-left">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Your name</label>
        <input
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Work email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="jane@smithcpa.ca"
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          How many T1 returns does your firm file per year?
        </label>
        <textarea
          required
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="~200 returns. Biggest pain is manual T4 entry and chasing clients for missing slips..."
          rows={4}
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] resize-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--emerald)] px-8 py-4 text-base font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
        ) : (
          'Book a 30-minute call →'
        )}
      </button>
      <p className="text-center text-xs text-white/30">
        No sales pressure. We reply within 24 hours.
      </p>
    </form>
  );
}

export default function ForCPAsPage() {
  return (
    <main className="flex flex-col min-h-screen" style={{ background: '#0a1020' }}>
      {/* Hero — pt-24 accounts for fixed 64px NavBar */}
      <section className="bg-[var(--navy)] pt-32 pb-24 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-[var(--emerald)] mb-8"
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
                <a href="#contact" className="inline-flex items-center rounded-full bg-[var(--emerald)] px-8 py-4 text-base font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors shadow-lg shadow-emerald-500/25">
                  Book a demo →
                </a>
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
      <section className="py-20" style={{ background: '#0d1828' }}>
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white">
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
                icon: <Clock className="h-6 w-6 text-red-400" />,
                title: '3+ hours per return on data entry',
                body: 'Your team manually keys T4, T5, and RRSP data from client-supplied PDFs and photos. Error-prone and demoralizing.',
              },
              {
                icon: <FileWarning className="h-6 w-6 text-amber-400" />,
                title: 'Clients send incomplete docs',
                body: "Chasing clients for missing slips extends your busy season. Clients don't know what they need to send.",
              },
              {
                icon: <Users className="h-6 w-6 text-white/40" />,
                title: 'No scalable client intake',
                body: "Every client onboards differently — email, paper, or an ad-hoc shared folder. There's no consistent process.",
              },
            ].map(({ icon, title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-2xl p-8"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20" style={{ background: '#0a1020' }}>
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white">
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
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[var(--emerald)] font-bold text-lg">
                    {step}
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                  <p className="text-white/55 leading-relaxed mb-3">{body}</p>
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
      <section className="py-20" style={{ background: '#0d1828' }}>
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white">
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
              { title: "White-label available", body: "Run TaxAgent under your firm's brand. Custom domain, logo, and colour scheme." },
              { title: 'API access', body: 'Integrate client data directly into your practice management system via REST API.' },
              { title: 'Dedicated account manager', body: 'A dedicated CSM helps your team onboard and gets you to full utilization fast.' },
            ].map(({ title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-xl p-6 flex gap-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="mt-0.5 h-5 w-5 flex-shrink-0">
                  <Check className="h-5 w-5 text-[var(--emerald)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA — real contact form, POSTs to /api/contact → zohaibghani556@gmail.com */}
      <section id="contact" className="bg-[var(--navy)] py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Want to be a design partner?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-300 mb-10 leading-relaxed">
              We&apos;re working with a small number of CPA firms to shape the product.
              Tell us about your practice and we&apos;ll set up a 30-minute call.
            </motion.p>
            <motion.div variants={fadeUp}>
              <CPAContactForm />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
