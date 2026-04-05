'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to your account</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              className="peer w-full rounded-xl border border-[var(--border)] bg-white px-4 pt-5 pb-2 pr-10 text-sm text-[var(--text-primary)] placeholder-transparent focus:border-[var(--emerald)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 transition-colors"
              autoComplete="current-password"
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

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-[var(--emerald)] hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-full bg-[var(--emerald)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
          >
            Sign in
          </motion.button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-full border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </motion.button>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--emerald)] font-semibold hover:underline">
            Start free →
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
