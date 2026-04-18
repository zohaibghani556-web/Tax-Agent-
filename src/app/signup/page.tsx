'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const inputCls =
  'peer w-full rounded-xl px-4 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none transition-colors';
const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
};
const labelCls =
  'absolute left-4 top-1 text-[10px] font-semibold text-white/40 uppercase tracking-wide pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-white/40 peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-[var(--emerald)]';
const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
};

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.met).length;
  const colors = ['bg-red-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? colors[strength] : ''}`}
            style={i < strength ? {} : { background: 'rgba(255,255,255,0.10)' }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(({ label, met }) => (
          <span key={label} className={`flex items-center gap-1 text-xs ${met ? 'text-[var(--emerald)]' : 'text-white/30'}`}>
            <Check className="h-3 w-3" />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded flex items-center justify-center transition-colors`}
      style={{
        border: checked ? '2px solid var(--emerald)' : '2px solid rgba(255,255,255,0.20)',
        background: checked ? 'var(--emerald)' : 'transparent',
      }}
      role="checkbox"
      aria-checked={checked}
    >
      {checked && <Check className="h-2.5 w-2.5 text-white" />}
    </button>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const referredBy = searchParams.get('ref') ?? undefined;
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [pipedaConsent, setPipedaConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError('Please agree to the terms to continue.'); return; }
    if (!pipedaConsent) { setError('Please consent to data processing to continue.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          subscription_tier: 'free',
          ...(referredBy ? { referred_by: referredBy } : {}),
        },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--background)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={cardStyle}
        >
          <div className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <MailCheck className="h-7 w-7 text-[var(--emerald)]" />
          </div>
          <h1 className="text-xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-white/50">
            We&apos;ve sent a confirmation link to <strong className="text-white/80">{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-[var(--emerald)] font-semibold hover:underline">
            Back to sign in
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--background)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-2xl p-8"
        style={cardStyle}
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-xl font-semibold text-white">
            TaxAgent<span className="text-[var(--emerald)]">.ai</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-white/50">Free to start — no credit card needed</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-red-300"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {error}
            </div>
          )}

          {/* Name */}
          <div className="relative">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=" "
              required
              className={inputCls}
              style={inputStyle}
              autoComplete="name"
            />
            <label htmlFor="name" className={labelCls}>Full name</label>
          </div>

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
              className={inputCls}
              style={inputStyle}
              autoComplete="email"
            />
            <label htmlFor="email" className={labelCls}>Email address</label>
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                className={`${inputCls} pr-10`}
                style={inputStyle}
                autoComplete="new-password"
              />
              <label htmlFor="password" className={labelCls}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={agreed} onChange={() => setAgreed(!agreed)} />
            <span className="text-xs text-white/50 leading-relaxed">
              I agree to the{' '}
              <Link href="/terms" className="text-[var(--emerald)] hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-[var(--emerald)] hover:underline">Privacy Policy</Link>
            </span>
          </label>

          {/* PIPEDA consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={pipedaConsent} onChange={() => setPipedaConsent(!pipedaConsent)} />
            <span className="text-xs text-white/50 leading-relaxed">
              I consent to TaxAgent.ai collecting and securely processing my tax information solely for the purpose of preparing my 2025 Ontario T1 return, stored in Canada (AWS ca-central-1), in accordance with PIPEDA.
            </span>
          </label>

          <motion.button
            type="submit"
            disabled={!agreed || !pipedaConsent || loading}
            whileHover={agreed && !loading ? { scale: 1.02 } : {}}
            whileTap={agreed && !loading ? { scale: 0.98 } : {}}
            className="w-full rounded-full bg-[var(--emerald)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : 'Create account'}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--emerald)] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>

      {/* Trust strip */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/35">
        <span>🔒 Data stored in Canada</span>
        <span className="text-white/15">·</span>
        <span>PIPEDA compliant</span>
        <span className="text-white/15">·</span>
        <span>Free for simple returns</span>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
