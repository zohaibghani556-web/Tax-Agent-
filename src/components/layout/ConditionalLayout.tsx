'use client';

/**
 * ConditionalLayout — renders public-page chrome (NavBar, Lenis smooth-scroll,
 * scroll progress bar) only on marketing routes. App routes (/dashboard, /slips,
 * etc.) use AppShell for navigation so none of these are needed there.
 *
 * Must be a client component so we can read the pathname.
 */

import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';
import { LenisProvider } from '@/components/ui/lenis-provider';
import { ScrollProgressBar } from '@/components/ui/scroll-progress-bar';

const APP_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/slips',
  '/calculator',
  '/filing-guide',
  '/settings',
  '/history',
  '/recovery',
  '/family',
];

function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAppRoute(pathname)) {
    // App shell handles its own navigation — no extra chrome here.
    return <>{children}</>;
  }

  // Public / marketing pages get smooth-scroll, progress bar, and the nav.
  return (
    <LenisProvider>
      <ScrollProgressBar />
      <NavBar />
      {children}
    </LenisProvider>
  );
}
