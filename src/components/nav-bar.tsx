'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
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
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const lastScrollY = useRef(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 20);

      // Hide on scroll down (past 120px), show on scroll up
      if (y > lastScrollY.current && y > 120) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isHome = pathname === '/';

  return (
    <motion.header
      animate={prefersReduced ? {} : { y: hidden ? -72 : 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300',
        (scrolled || !isHome)
          ? 'bg-[#0a1628]/90 backdrop-blur-xl border-b border-white/[0.07] shadow-lg shadow-black/20'
          : 'bg-transparent',
      )}
      style={{ height: 64 }}
    >
      {/* Scroll progress hint — subtle top border that fades in */}
      {scrolled && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)',
          }}
        />
      )}

      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center group" aria-label="TaxAgent.ai home">
          <span className="text-xl font-semibold tracking-tight text-white">
            TaxAgent<span className="text-[#10B981]">.ai</span>
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
                  'relative px-3 py-2 rounded-md transition-colors duration-200 font-medium',
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white',
                )}
              >
                {label}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-white/8"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-white/70 font-medium hover:text-white transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-[#10B981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] transition-colors duration-200 shadow-lg shadow-emerald-500/20"
          >
            Start free →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full max-w-xs p-0 bg-[#0a1628] border-white/10"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
                <Link href="/" onClick={() => setOpen(false)} className="text-xl font-semibold text-white">
                  TaxAgent<span className="text-[#10B981]">.ai</span>
                </Link>
              </div>
              <nav className="flex flex-col px-4 py-6 gap-1 flex-1">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-md text-white/70 hover:text-white hover:bg-white/8 font-medium transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-4 pb-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-full border border-white/20 text-white font-semibold transition-colors hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-full bg-[#10B981] text-white font-semibold hover:bg-[#059669] transition-colors"
                >
                  Start free →
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
