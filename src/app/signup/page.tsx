'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check } from 'lucide-react';

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
            className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? colors[strength] : 'bg-[var(--border)]'}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(({ label, met }) => (
          <span key={label} className={`flex items-center gap-1 text-xs ${met ? 'text-[var(--emerald)]' : 'text-[var(--text-muted)]'}`}>
            <Check className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[var(--surface)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white rounded-2xl p-8"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-xl font-semibold text-[var(--navy)]">
            TaxAgent<span className="text-[var(--emerald)]">.ai</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Create your account</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Free to start — no credit card needed</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {/* Name */}
          <div className="relative">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=" "
              className="peer w-full rounded-xl border border-[var(--border)] bg-white px-4 pt-5 pb-2 text-sm text-[var(--text-primary)] placeholder-transparent focus:border-[var(--emerald)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 transition-colors"
              autoComplete="name"
            />
            <label
              htmlFor="name"
              className="absolute left-4 top-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-[var(--text-secondary)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-[var(--emerald)]"
            >
              Full name
            </label>
          </div>

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              className="peer w-full rounded-xl border border-[var(--border)] bg-white px-4 pt-5 pb-2 text-sm text-[var(--text-primary)] placeholder-transparent focus:border-[var(--emerald)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 transition-colors"
              autoComplete="email"
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-[var(--text-secondary)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-[var(--emerald)]"
            >
              Email address
            </label>
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
                className="peer w-full rounded-xl border border-[var(--border)] bg-white px-4 pt-5 pb-2 pr-10 text-sm text-[var(--text-primary)] placeholder-transparent focus:border-[var(--emerald)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 transition-colors"
                autoComplete="new-password"
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-[var(--text-secondary)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-[var(--emerald)]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${agreed ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'}`}
              >
                {agreed && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
            </div>
            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
              I agree to the{' '}
              <Link href="/terms" className="text-[var(--emerald)] hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-[var(--emerald)] hover:underline">Privacy Policy</Link>
            </span>
          </label>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!agreed}
            className="w-full rounded-full bg-[var(--emerald)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create account
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--emerald)] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
