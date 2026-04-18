# Cross-Cutting UI Polish — Changelog

All changes are design-only (no logic, no new features). Build, typecheck, and lint all pass clean.

---

## globals.css

- Replaced hardcoded `#0a1020` → `var(--background)` on `body { background }`.
- Replaced hardcoded `#f0f9f6` → `var(--text-primary)` on `body { color }`.

---

## nav-bar.tsx

- `text-[#10B981]` → `text-[var(--emerald)]` (logo `.ai` accent, 2 instances: desktop + mobile sheet).
- `bg-[#10B981]` → `bg-[var(--emerald)]` (avatar initials bubble, desktop + mobile, 3 instances).
- `hover:bg-[#059669]` → `hover:bg-[var(--emerald-dark)]` (CTA button hover, 2 instances).
- `bg-[#0a1628]` → `bg-[var(--navy)]` (mobile Sheet panel background).
- Desktop "Start free →" CTA shadow: `shadow-lg shadow-emerald-500/20` → `shadow-[0_10px_30px_rgba(16,185,129,0.3)]` (standardised emerald halo).

---

## AppShell.tsx / CPAShell.tsx

- Active nav item: `text-[#10B981]` → `text-[var(--emerald)]` in both shell mobile bottom-nav bars.

---

## ChatInterface.tsx

- User message bubble `background: '#10B981'` → `background: 'var(--emerald)'`.
- Icon cell `color: '#10B981'` → `color: 'var(--emerald)'`.
- Live indicator `color: '#10B981'` → `color: 'var(--emerald)'`.
- Send button hover/leave handlers: `'#059669'` → `'var(--emerald-dark)'`, `'#10B981'` → `'var(--emerald)'`.

---

## app/page.tsx (Homepage)

- Section eyebrows: all `text-[11px] font-semibold tracking-[0.15em] uppercase text-[var(--emerald)]` upgraded to `text-[12px]` (6 section eyebrows + 2 card-level eyebrows).

---

## app/pricing/page.tsx

- All `text-[11px] font-semibold uppercase tracking-[0.15em]` eyebrows → `text-[12px]` (4 instances: plan name labels + section eyebrows for Compare, FAQ, Pricing).

---

## app/(app)/dashboard/page.tsx

- MetricCard label eyebrow `text-[11px]` → `text-[12px]`.

---

## app/(app)/slips/page.tsx

- Section eyebrow "STEP 2 OF 4": `text-[11px]` → `text-[12px]`, `'#10B981'` → `'var(--emerald)'`.
- `TONE.done.text`: `'#10B981'` → `'var(--emerald)'`.
- Checklist done indicator: `background: done ? '#10B981'` → `'var(--emerald)'`, `color: done ? '#10B981'` → `'var(--emerald)'`.
- Upload icon color: `'#10B981'` → `'var(--emerald)'`.
- Entered slip badge: `color: '#10B981', background: 'rgba(16,185,129,0.12)'` → token ref (`var(--emerald-tint)`).
- FileText icon: `'#10B981'` → `'var(--emerald)'`.
- "Calculate my taxes" pill CTA: `background: '#10B981'` → `'var(--emerald)'` (halo already present).
- Edit Dialog bg: `bg-[#0d1828]` → `bg-[var(--surface)]`.

---

## app/(app)/recovery/page.tsx

- `bg-[#0a1020]` → `bg-[var(--background)]` (idle + results wrapper, 2 instances).

---

## app/(app)/family/page.tsx

- `bg-[#0a1020]` → `bg-[var(--background)]` (page wrapper).
- Savings figure `color: '#ffffff'` when no savings → `'var(--text-primary)'` (no pure white body text rule).

---

## app/estimate/page.tsx

- `bg-[#0a1020]` → `bg-[var(--background)]` (all 4 view wrappers).

---

## app/login/page.tsx / app/signup/page.tsx

- `style={{ background: '#0a1020' }}` → `'var(--background)'` on both auth page roots.

---

## app/for-cpas/page.tsx

- `style={{ background: '#0a1020' }}` → `'var(--background)'` (page root + alternating sections, 2 instances).
- `style={{ background: '#0d1828' }}` → `'var(--surface)'` (alternating sections, 2 instances).
- Primary "Book a demo →" CTA: `shadow-lg shadow-emerald-500/25` → `shadow-[0_10px_30px_rgba(16,185,129,0.3)]`.

---

## app/not-found.tsx

- `style={{ background: '#0a1020' }}` → `'var(--background)'`.
- "Go home" primary CTA: added `shadow-[0_10px_30px_rgba(16,185,129,0.3)]` emerald halo.

---

## app/global-error.tsx

- Body text heading `color: '#ffffff'` → `'#f0f9f6'` (no pure #fff rule; CSS vars unavailable in isolated `<html>` context — exception noted).
- Added `color: '#f0f9f6'` to body inline style for consistency.

---

## app/privacy/page.tsx / app/terms/page.tsx

- `bg-[#0a1020]` → `bg-[var(--background)]` on page `<main>`.

---

## app/cpa/returns/page.tsx

- All `text-[11px] uppercase tracking-[0.15em]` eyebrows → `text-[12px]` (5 instances).

---

## app/(app)/history/page.tsx

**Empty state redesigned** to match brand spec (emerald icon cell + headline + subcopy + single CTA):
- Replaced bare `Clock` icon (`text-white/20`) with a `w-14 h-14 rounded-2xl` emerald-tinted icon cell.
- Headline: `text-white/70` → `text-white`.
- Subcopy: `text-white/30` → `text-white/40`.
- CTA: added `shadow-[0_10px_30px_rgba(16,185,129,0.3)]` halo.

---

## components/calculator/RefundReveal.tsx

- Particle `bg-[#10B981]` → `bg-[var(--emerald)]`.
- Verdict label, amount, and sub-label colours: `'#10B981'` → `'var(--emerald)'`, `'#EF4444'` → `'var(--error)'` (2 `style` props, covers both refund + owing states).
- CTA button `background: isRefund ? '#10B981' : '#EF4444'` → token refs.

---

## components/calculator/WhatIfEngine.tsx

- `text-[#10B981]` → `text-[var(--emerald)]` (icon, savings text, outcome text — 4 instances).
- `accent-[#10B981]` → `accent-[var(--emerald)]` (range inputs, 2 instances).

---

## components/calculator/TaxOptimizer.tsx

- RRSP slider gradient: `#10B981` → `var(--emerald)`.

---

## components/calculator/CreditFinder.tsx

- `text-[#10B981]` → `text-[var(--emerald)]` (CheckCircle2 icon in zero-state).
- Estimate badge `color: '#10B981'` → `'var(--emerald)'`.

---

## components/calculator/TaxBreakdownChart.tsx

- Net Take-Home segment colour: `'#10B981'` → `'var(--emerald)'`.

---

## components/dashboard/CompletionRing.tsx

- `ringColor()` return: `'#10B981'` → `'var(--emerald)'`.
- Step labels `text-[11px]` → `text-[12px]` (2 instances).

---

## components/layout/AppShell.tsx / CPAShell.tsx

- Active nav `'text-[#10B981]'` → `'text-[var(--emerald)]'`.

---

## components/slips/SlipUpload.tsx

- OCR button: `bg-[#10B981] hover:bg-[#059669]` → token refs (2 buttons).
- Loading spinner: `text-[#10B981]` → `text-[var(--emerald)]`.
- Confidence colour: `'#10B981'` → `'var(--emerald)'`, `'#F59E0B'` → `'var(--warning)'`.

---

## components/slips/ManualEntryForm.tsx

- Submit button: `bg-[#10B981] hover:bg-[#059669]` → token refs.

---

## components/ui/cookie-banner.tsx

- Accept button: `bg-[#10b981] hover:bg-[#059669]` → token refs.

---

## components/ui/scroll-progress-bar.tsx

- Progress bar gradient: `#10b981` → `var(--emerald)` (all 3 occurrences in bar + glow + badge colour).

---

## components/ui/magnetic-button.tsx

- Emerald variant: `#10b981` → `var(--emerald)`, `#059669` → `var(--emerald-dark)` (background gradient, outline colour, ghost colour).
- `color: '#fff'` → `'var(--white)'`.

---

## components/ui/pricing-card-3d.tsx

- All `#10b981` → `var(--emerald)` (border gradient, badge bg, plan name colour, divider, check icon, CTA bg).
- `#059669` → `var(--emerald-dark)` (CTA hover bg).
- `#0a1628` → `var(--navy)` in gradient stop.
- `color: '#fff'` → `'var(--white)'` (badge label + CTA text).

---

## components/ui/animated-hero-background.tsx

- Blob 1 glow: `radial-gradient(circle, #10b981 ...)` → `var(--emerald)`.
- Blob 2 glow: `radial-gradient(circle, #059669 ...)` → `var(--emerald-dark)`.

---

## components/magicui/border-beam.tsx

- Default prop `colorFrom = '#10B981'` → `'var(--emerald)'`.

---

## Not changed (deliberate exceptions)

| File | Reason |
|------|--------|
| `app/opengraph-image.tsx` — `color: '#ffffff'` | Satori / ImageResponse does not support CSS custom properties. Literal hex required. |
| `app/global-error.tsx` — `background: '#0a1020'` | Renders its own `<html>/<body>`, globals.css not injected. CSS vars unavailable. |
| `magicui/shimmer-button.tsx` — `shimmerColor = '#ffffff'` | Default prop feeds into a CSS `background` string; shimmer white is intentional and correct. |

---

## Build verification

```
npx tsc --noEmit  → 0 errors
npm run lint      → 0 new warnings (only pre-existing unused-var warnings in engine files)
npm run build     → all routes compiled successfully
```
