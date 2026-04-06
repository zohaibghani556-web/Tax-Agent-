import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found | TaxAgent.ai',
};

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center bg-white">
      <p className="text-8xl font-black text-[var(--border)] mb-6">404</p>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Page not found</h1>
      <p className="text-[var(--text-secondary)] max-w-sm mb-8">
        This page doesn&apos;t exist. You might have followed a broken link or typed the URL incorrectly.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-[var(--emerald)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
