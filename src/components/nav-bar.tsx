'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/for-cpas', label: 'For CPAs' },
  { href: '/#how-it-works', label: 'How it works' },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all',
        'bg-white/90 backdrop-blur-md border-b border-[var(--border)]',
        scrolled && 'shadow-[var(--shadow-sm)]',
      )}
      style={{ height: 64, transition: 'all var(--transition)' }}
    >
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center" aria-label="TaxAgent.ai home">
          <span className="text-xl font-semibold text-[var(--navy)] tracking-tight">
            TaxAgent<span className="text-[var(--emerald)]">.ai</span>
          </span>
        </Link>

        {/* Desktop nav — center */}
        <nav className="hidden md:flex items-center gap-1 text-sm absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href.replace('/#', '/')));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-2 rounded-md transition-colors',
                  isActive
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-[var(--navy)] font-medium hover:opacity-70 transition-opacity"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-[var(--emerald)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors shadow-sm"
          >
            Start free →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center px-6 h-16 border-b border-[var(--border)]">
                <Link href="/" onClick={() => setOpen(false)} className="text-xl font-semibold text-[var(--navy)]">
                  TaxAgent<span className="text-[var(--emerald)]">.ai</span>
                </Link>
              </div>
              <nav className="flex flex-col px-4 py-6 gap-1 flex-1">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 font-medium transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-4 pb-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-full border border-[var(--border)] text-[var(--navy)] font-semibold transition-colors hover:bg-slate-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-full bg-[var(--emerald)] text-white font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
                >
                  Start free →
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
