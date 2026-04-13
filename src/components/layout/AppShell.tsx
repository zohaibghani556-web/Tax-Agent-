'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart2,
  BookOpen,
  Calculator,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/onboarding', icon: MessageSquare, label: 'Assessment' },
  { href: '/slips', icon: FileText, label: 'My Slips' },
  { href: '/calculator', icon: Calculator, label: 'Calculator' },
  { href: '/recovery', icon: RotateCcw, label: 'Recovery' },
  { href: '/filing-guide', icon: BookOpen, label: 'Filing Guide' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const MOBILE_NAV = NAV_ITEMS.slice(0, 5); // Dashboard, Assessment, Slips, Calculator, Guide

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? '');
        setUserName(
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'User'
        );
      }
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = userName || 'User';
  const displayInitials = initials(displayName);

  return (
    <div className="min-h-screen bg-[var(--surface)] flex">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[var(--navy)] z-40">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">
              TaxAgent<span className="text-[var(--emerald)]">.ai</span>
            </span>
          </Link>
          <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            2025
          </span>
        </div>

        {/* User section */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="h-9 w-9 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-sm font-bold flex-shrink-0">
            {displayInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            {userEmail && (
              <p className="text-xs text-slate-400 truncate">{userEmail}</p>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  active
                    ? 'bg-white/15 text-white border-l-2 border-[var(--emerald)] pl-[10px]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-[var(--emerald)]' : 'text-slate-400 group-hover:text-white')} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-2 pb-4 border-t border-white/10 pt-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all w-full text-left group"
          >
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-white" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-[var(--navy)] h-14 flex items-center justify-between px-4 border-b border-white/10">
          <Link href="/dashboard" className="text-lg font-semibold text-white">
            TaxAgent<span className="text-[var(--emerald)]">.ai</span>
          </Link>
          <div className="h-8 w-8 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-xs font-bold">
            {displayInitials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 h-16"
        style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                active ? 'text-[#10B981]' : 'text-white/40 hover:text-white/70',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
