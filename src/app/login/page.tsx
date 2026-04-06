'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : authError.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[var(--surface)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white rounded-2xl p-8"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-xl font-semibold text-[var(--navy)]">
            TaxAgent<span className="text-[var(--emerald)]">.ai</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
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
              required
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading ? {} : { scale: 0.98 }}
            className="w-full rounded-full bg-[var(--emerald)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : 'Sign in'}
          </motion.button>
        </form>

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
