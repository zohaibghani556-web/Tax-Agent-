import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found | TaxAgent.ai',
};

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center" style={{ background: '#0a1020' }}>
      <p className="text-8xl font-black mb-6" style={{ color: 'rgba(255,255,255,0.08)' }}>404</p>
      <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
      <p className="text-white/50 max-w-sm mb-8">
        This page doesn&apos;t exist. You might have followed a broken link or typed the URL incorrectly.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-[#10B981] px-6 py-3 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full px-6 py-3 text-sm font-semibold text-white/60 hover:text-white transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
