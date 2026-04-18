'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Menu, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/for-cpas', label: 'For CPAs' },
  { href: '/#how-it-works', label: 'How it works' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const lastScrollY = useRef(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 20);
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

  // Sync auth state on mount and on change
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          name: (data.user.user_metadata?.full_name as string | undefined)
            ?? data.user.email?.split('@')[0]
            ?? 'User',
          email: data.user.email ?? '',
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: (session.user.user_metadata?.full_name as string | undefined)
            ?? session.user.email?.split('@')[0]
            ?? 'User',
          email: session.user.email ?? '',
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  }

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
            TaxAgent<span className="text-[var(--emerald)]">.ai</span>
          </span>
        </Link>

        {/* Desktop nav — center */}
        <nav className="hidden md:flex items-center gap-1 text-sm absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && !href.startsWith('/#') && pathname.startsWith(href));
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 transition-colors px-3 py-1.5 text-sm text-white font-medium"
                  aria-label="Account menu"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--emerald)] text-[10px] font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm text-white/70 font-medium hover:text-white transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-[var(--emerald)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors duration-200 shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
              >
                Start free →
              </Link>
            </>
          )}
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
            className="w-full max-w-xs p-0 bg-[var(--navy)] border-white/10"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
                <Link href="/" onClick={() => setOpen(false)} className="text-xl font-semibold text-white">
                  TaxAgent<span className="text-[var(--emerald)]">.ai</span>
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
                {user && (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-md text-white/70 hover:text-white hover:bg-white/8 font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                )}
              </nav>
              <div className="px-4 pb-8 flex flex-col gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--emerald)] text-xs font-bold text-white">
                        {initials(user.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setOpen(false); handleSignOut(); }}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-white/20 text-white font-semibold transition-colors hover:bg-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
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
                      className="flex items-center justify-center px-4 py-3 rounded-full bg-[var(--emerald)] text-white font-semibold hover:bg-[var(--emerald-dark)] transition-colors"
                    >
                      Start free →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
