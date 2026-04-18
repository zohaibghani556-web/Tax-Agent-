# TaxAgent.ai — Design System Audit

**Date:** April 2026  
**Audited against:** `~/.claude/skills/taxagent-design/` (README + colors_and_type.css + ui_kits)  
**Scope:** All routes under `src/app/`  
**Auditor:** Claude Code (taxagent-design skill)

---

## Summary Table (sorted by priority)

| Priority | Route | Purpose | Key Violations |
|----------|-------|---------|----------------|
| **P0** | `/family` | Family joint-tax optimizer | Off-brand colours (#4ade80, #818cf8, #34d399); gradient CTAs not pill |
| **P0** | `/dashboard` | User home — progress, metrics, quick actions | Primary CTAs `rounded-xl` not `rounded-full`; 40+ hardcoded `#10B981` |
| **P0** | `/recovery` | Retroactive missed-credit scanner | Primary CTA `rounded-2xl` not pill; hardcoded hex throughout |
| **P1** | `/` | Marketing homepage | ~70 hardcoded `#10B981`; eyebrows use `tracking-widest` not `tracking-[0.15em]` |
| **P1** | `/pricing` | Plan comparison + FAQs | Hardcoded `#10B981` and `#059669`; inline style bg colours |
| **P1** | `/estimate` | No-login 60-second estimator | Missing `tabular-nums` on result amounts; CTA `rounded-2xl` not pill |
| **P1** | `/login` | Login form | Hardcoded `#10B981` and `#0a1020`; no CSS vars used |
| **P1** | `/signup` | Registration form | Hardcoded `#10B981` throughout incl. JS conditional (checkbox border) |
| **P1** | `/onboarding` | AI assessment chat | Hardcoded `#10B981`/`#059669` inside CSS gradients |
| **P1** | `/slips` | Slip upload + OCR review | Hardcoded hex; missing `tabular-nums` on amounts |
| **P1** | `/calculator` | Detailed tax calculator form | Hardcoded `#10B981`, `#F59E0B`, `#EF4444` + non-standard inline conditionals |
| **P1** | `/for-cpas` | CPA portal marketing + contact | Inconsistent: some `var(--emerald)` (good), many hardcoded `#10B981` (bad) |
| **P1** | `/settings` | Account settings | Mix of CSS vars (text) and hardcoded hex (emerald) — inconsistent |
| **P2** | `/filing-guide` | Personalised T1 filing checklist | Hardcoded `#10B981` in class names; buttons + cards otherwise correct |
| **P2** | `/history` | Calculation history | Minimal hardcoding (2 instances); mostly compliant |
| **P2** | `/privacy` | PIPEDA privacy policy | Link colour hardcoded `#10B981` (4 instances) |
| **P2** | `/terms` | Terms of service | Link colour hardcoded `#10B981` (4 instances) |
| **P2** | `/cpa/returns` | CPA review dashboard | Shadow uses hardcoded `rgba(16,185,129,0.25)`; otherwise best-practice |

---

## Routes — Full Detail

### `/` — Marketing Homepage
**Purpose:** Top-of-funnel marketing page with hero, animated estimator, features, pricing preview, and footer.  
**Components:** Framer Motion (fadeUp, word reveal, CountUp, 3D tilt, float), `AnimatedHeroBackground`, `MagneticButton`, `PricingCard3D`, lucide-react icons.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **~70+ hardcoded `#10B981`** across class names and inline styles. Every instance should be `var(--emerald)` or the Tailwind alias `emerald-500`. |
| P1 | **~5 hardcoded `#059669`** (hover state). Should be `var(--emerald-dark)` or `hover:bg-emerald-600`. |
| P1 | **Hardcoded `#0a1020`, `#0d1828`** in inline `style={}` props. Should be `var(--background)` / `var(--surface)`. |
| P1 | **Section eyebrows use `tracking-widest`** (Tailwind default = 0.1em). Spec requires `tracking-[0.15em]`. Affects every section header (HOW IT WORKS, FEATURES, PRICING, etc.). |
| P1 | **`#1A2744`** used once — not a design-system token. Replace with `var(--navy-light)` (`#1a2744` ✓ same value but should come from token). |
| P2 | Hardcoded `#F59E0B` (warning/amber) in one location — should be `var(--warning)`. |

#### Suggested improvements (P1 route — 5 max)
1. Replace every `#10B981` / `bg-[#10B981]` / `text-[#10B981]` with `var(--emerald)` / `text-[var(--emerald)]` / `bg-[var(--emerald)]`.
2. Replace every `#059669` with `var(--emerald-dark)`.
3. Replace inline `style={{ background: '#0a1020' }}` etc. with `bg-[var(--background)]` Tailwind class.
4. Global find-replace `tracking-widest` → `tracking-[0.15em]` on every eyebrow span.
5. Extract the six hardcoded gradient stop colours in the hero blob animation into CSS custom properties in `globals.css` (`--hero-blob-a`, `--hero-blob-b`, `--hero-blob-c`).

---

### `/pricing` — Pricing Page
**Purpose:** Three-tier plan comparison (Free / Pro / CPA), feature table, FAQ accordion.  
**Components:** Framer Motion, `PricingCard3D`, lucide-react, shadcn `Tabs`.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Hardcoded `#10B981`** throughout (buttons, checkmarks, eyebrow, feature labels). |
| P1 | **Hardcoded `#059669`** (hover). Should be `var(--emerald-dark)`. |
| P1 | **Inline `style={{ background: '#0a1020' }}`** and `style={{ background: '#0d1828' }}`. Should use CSS vars. |
| P2 | Eyebrow above pricing section hardcodes `text-[#10B981]` — should be `text-[var(--emerald)]`. |
| P2 | Money amounts (plan prices) have no `tabular-nums` class — add for column alignment. |

#### Suggested improvements
1. Replace all emerald hardcodes with CSS vars (same pattern as homepage fix).
2. Replace inline background style objects with Tailwind `bg-[var(--background)]`.
3. Add `tabular-nums` to plan price numerals (`$49`, `$149`).
4. Verify Pro card accent gradient uses `rgba(16,185,129,0.15)` / `rgba(16,185,129,0.35)` — confirm these come from `var(--emerald-tint)` and `var(--border-emerald)`.
5. Add `shadow-[0_0_60px_rgba(16,185,129,0.12)]` to Pro card (design spec: pro card gets emerald glow).

---

### `/for-cpas` — CPA Portal Marketing
**Purpose:** CPA-targeted landing page with value props, contact form, and portal link.  
**Components:** Framer Motion, glass cards, shadcn `Input`/`Textarea`/`Button`, lucide-react.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Inconsistent token usage**: some buttons correctly use `var(--emerald)` and `var(--emerald-dark)` (good, keep these), while other elements on the same page hardcode `#10B981` (lines 51, 70, 82, 104, 130). This inconsistency is the P1 issue. |
| P1 | **Hardcoded `#0a1628`** on section backgrounds (outside the known AppShell mobile-nav exception). Should be `var(--navy)`. |
| P2 | Eyebrow labels hardcode `text-[#10B981]` — should match the button pattern and use `text-[var(--emerald)]`. |

#### Suggested improvements
1. Audit every `#10B981` instance — wherever a `var(--emerald)` already exists nearby, normalize the stragglers to match.
2. Replace `style={{ background: '#0a1628' }}` section backgrounds with `bg-[var(--navy)]`.
3. Ensure the contact form submit button uses the full pill + glow recipe: `rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)]`.
4. Add a section eyebrow ("CPA PORTAL") above the feature grid using the canonical eyebrow pattern.
5. The "Design partner" pricing card should use the accent card recipe (emerald tint bg + emerald border) to match the Pro card on `/pricing`.

---

### `/estimate` — 60-Second Estimator
**Purpose:** No-login viral tax estimator; multi-step form with animated refund reveal.  
**Components:** Framer Motion, custom slider, results card, share buttons.

#### Violations
| Severity | Finding |
|----------|---------|
| P0/P1 | **Primary CTA button uses `rounded-2xl`**, not `rounded-full`. The estimator's "Calculate my refund →" button is the product's highest-conversion CTA — it must be a pill. |
| P1 | **Missing `tabular-nums`** on the large refund amount display (the animated CountUp number). Add `font-variant-numeric: tabular-nums` or the Tailwind class. |
| P1 | **Hardcoded `#0a0f0a`** (non-standard dark — slightly different from `--background` `#0a1020`) on lines 403, 445, 579, 857. Unify to `var(--background)`. |
| P2 | Slider track uses Tailwind `emerald-500` class (fine) but could be `bg-[var(--emerald)]` for full consistency. |

#### Suggested improvements
1. Change CTA button `rounded-2xl` → `rounded-full` and add `shadow-[0_10px_30px_rgba(16,185,129,0.3)]` glow.
2. Add `tabular-nums` class to the refund amount `<span>` wrapping the CountUp output.
3. Replace inline `style={{ background: '#0a0f0a' }}` with `bg-[var(--background)]`.
4. Add a trust bar (`🔒 Data stored in Canada · PIPEDA compliant · Free for simple returns`) below the CTA — absent on this page but present on homepage. High-conversion placement.
5. Ensure the "Share your refund" button uses the secondary pill recipe (white/5 bg, border white/15, `rounded-full`).

---

### `/login` — Login
**Purpose:** Email/password login form with "forgot password" and signup link.  
**Components:** Framer Motion, shadcn `Input`, custom animated form.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Hardcoded `#10B981`** on submit button, logo, and link colours (lines 61, 122, 130). No CSS vars used. |
| P1 | **Inline `style={{ background: '#0a1020' }}`** for page canvas. Should be `bg-[var(--background)]`. |
| P2 | Submit button has `rounded-full bg-[#10B981]` pill shape ✓ correct — only the value source is wrong. |

#### Suggested improvements
1. Replace `#10B981` instances with `var(--emerald)`.
2. Replace inline background style with CSS var / Tailwind class.
3. Add `shadow-[0_10px_30px_rgba(16,185,129,0.3)]` to the submit button (currently missing the CTA glow).
4. Ensure input focus ring uses `var(--emerald)` (`focus-visible:ring-[var(--emerald)]`).
5. Add a subtle emerald top-border accent to the login card (`border-t-2 border-[var(--emerald)]` or the full accent card recipe) to visually ground the form.

---

### `/signup` — Sign Up
**Purpose:** Registration form with email, password strength indicator, and terms consent.  
**Components:** Framer Motion, shadcn `Input`/`Checkbox`, password strength bar.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Hardcoded `#10B981`** throughout — buttons, strength bar, checkbox border, logo (8+ instances). |
| P1 | **JS conditional inline style** for checkbox checked state: `border: checked ? '2px solid #10B981' : ...` — hardcoded hex inside runtime logic. Should use a CSS class toggle. |
| P2 | Password strength bar colours (`#10B981`, amber, red) are hardcoded — should be `var(--success)`, `var(--warning)`, `var(--error)`. |

#### Suggested improvements
1. Replace all `#10B981` with `var(--emerald)`.
2. Refactor the checkbox checked-state from inline JS style to a Tailwind `data-[state=checked]:border-[var(--emerald)]` pattern.
3. Replace strength bar colour literals with `var(--success)` / `var(--warning)` / `var(--error)`.
4. Add CTA glow shadow to submit button (same as login fix above).
5. Ensure the terms/privacy links use `text-[var(--emerald)]` not `text-[#10B981]`.

---

### `/dashboard` — App Dashboard
**Purpose:** Authenticated user home — return completion ring, tax metrics, quick-action checklist.  
**Components:** `CompletionRing`, metric cards, `OnboardingBanner`, glass cards, lucide-react.

#### Violations
| Severity | Finding |
|----------|---------|
| **P0** | **Primary CTA buttons use `rounded-xl`** (lines 371, 442, 444). Design spec mandates `rounded-full` for every primary CTA. This is the most visible violation in the app shell — these buttons appear on the most-visited page. |
| P1 | **40+ hardcoded `#10B981`** across class names and inline styles. None use CSS vars. |
| P1 | **Hardcoded `rgba(16,185,129,...)` variants** in inline `style={}` objects. Should use token-based bg classes. |
| P2 | No section eyebrow above the "Quick actions" or "Your return" sections — minor but missing brand detail. |

#### Suggested improvements
1. **Immediately fix**: change all `rounded-xl` primary buttons to `rounded-full` and add `shadow-[0_10px_30px_rgba(16,185,129,0.3)]`.
2. Replace `#10B981` hardcodes with `var(--emerald)`.
3. Replace inline `style={{ background: 'rgba(16,185,129,...)' }}` with Tailwind utility classes using the token.
4. Add an uppercase emerald eyebrow ("YOUR 2025 RETURN") above the completion ring section.
5. Confirm `CompletionRing` component internally uses `var(--emerald)` / `var(--info)` (indigo at 51–99%) — audit that component separately if needed.

---

### `/onboarding` — AI Assessment Chat
**Purpose:** Conversational AI assessment that collects tax profile via streaming Claude chat.  
**Components:** `ChatInterface`, streaming SSE, slip recommendation cards, stepper.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Hardcoded hex in CSS gradients**: `linear-gradient(135deg, #10B981, #059669)` on lines 180, 206. Gradients in inline `style={}` cannot use CSS vars directly, but the values should be documented as intentional deviations or the gradient should be extracted to a CSS class in `globals.css`. |
| P1 | **Hardcoded `#10B981`** in class names for chat bubble borders, send button, and typing indicator (lines 180, 206, 233). |
| P2 | Slip recommendation card icons use `rounded-xl` icon cells — check they match the design spec (12×12px cell, 8px radius, emerald-tinted bg). |

#### Suggested improvements
1. Extract `linear-gradient(135deg, #10B981, #059669)` to a named CSS class `.gradient-emerald` in `globals.css`, so the hex is in one place.
2. Replace remaining hardcoded `#10B981` class strings with `var(--emerald)`.
3. Verify the streaming typing indicator (animated dots) uses `var(--emerald)` not hardcoded green.
4. Add `tabular-nums` to any refund/amount previews shown in the chat (if the engine returns an estimate mid-conversation).
5. The slip recommendation cards should match the glass card recipe exactly — confirm `backdrop-blur-xl` is applied.

---

### `/slips` — Slip Upload & OCR Review
**Purpose:** T4/T5/etc. upload interface, OCR status tracking, manual value editing.  
**Components:** `SlipUpload`, tab interface, shadcn `Dialog`/`Input`, slip type cards.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Hardcoded `#10B981`** on upload button, success states, extracted value highlights (9+ lines). |
| P1 | **Missing `tabular-nums`** on extracted monetary values in the OCR result cards (Box 14, Box 22 amounts). These are the most critical numbers to display in tabular format. |
| P2 | Upload zone border uses `rgba(16,185,129,0.3)` inline — should be `var(--border-emerald)`. |

#### Suggested improvements
1. Replace `#10B981` hardcodes with `var(--emerald)`.
2. Add `tabular-nums` class to every `<span>` rendering a slip box value (Box 14 employment income, Box 22 tax withheld, etc.).
3. The upload drop-zone active state should use `border-[var(--emerald)]` + `bg-[var(--emerald-tint)]` — verify it matches.
4. Slip type badge icons (💼 T4, 🏦 T5) are allowed per design spec; confirm no new emoji are introduced.
5. The "Processing…" state animation (spinner or pulse) should use `text-[var(--emerald)]` not hardcoded.

---

### `/calculator` — Detailed Tax Calculator
**Purpose:** Full-input tax calculator with deductions form, credit toggles, and real-time result panel.  
**Components:** Complex form UI, shadcn `Input`/`Select`, result cards, warning banners.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Hardcoded `#10B981`** extensively (15+ instances across buttons, section dividers, result highlights). |
| P1 | **Hardcoded `#F59E0B`** (warning amber) and **`#EF4444`** (error red) — these have canonical CSS vars (`var(--warning)`, `var(--error)`) that are unused here. |
| P1 | **Inline JS conditional colours**: `color: errors.length > 0 ? '#FCA5A5' : '#FCD34D'` (line 270) — non-standard values (`#FCA5A5` is rose-300, `#FCD34D` is yellow-300, neither is a brand token). Replace with `var(--error)` / `var(--warning)`. |
| P2 | Result panel amounts correctly have `tabular-nums` ✓ — good, no fix needed. |

#### Suggested improvements
1. Replace all `#10B981` with `var(--emerald)`.
2. Replace `#F59E0B` with `var(--warning)` and `#EF4444` with `var(--error)` throughout.
3. Fix the JS conditional (line 270): replace `#FCA5A5` / `#FCD34D` with `var(--error)` / `var(--warning)`.
4. Add section eyebrows ("INCOME", "DEDUCTIONS", "CREDITS", "RESULTS") above each form section — currently only section dividers exist.
5. Verify the result panel's refund amount uses the full emerald treatment: `text-[var(--emerald)]`, large tabular-nums, and the CountUp animation if the value changes.

---

### `/family` — Family Joint-Tax Optimizer
**Purpose:** Multi-person household income input; optimizes combined tax, RRSP splits, and pension splitting.  
**Components:** Multi-step form, comparison table, recommendation cards, Framer Motion.

#### Violations
| Severity | Finding |
|----------|---------|
| **P0** | **Off-brand colour palette**: `#4ade80` (Tailwind green-400), `#818cf8` (indigo-400), `#34d399` (emerald-400) used extensively as standalone colours and gradient stops. None are design-system tokens. The result panel looks visually disconnected from the rest of the product. |
| **P0** | **Primary CTA uses `rounded-2xl` with a gradient background** (`linear-gradient(135deg, #818cf8, #34d399)`) — wrong shape, wrong colour, wrong treatment. Should be `rounded-full`, solid `var(--emerald)`, emerald glow shadow. |
| P1 | Gradient in results header (`linear-gradient(135deg, #818cf8, #34d399)`) introduces indigo/teal that conflicts with the brand's single-accent rule. |
| P1 | `#4ade80` used for "savings" amounts — should be `var(--emerald)` / `text-emerald-400`. |

#### Suggested improvements
1. **Delete the off-brand gradient** (`#818cf8`, `#34d399`) from the results panel header and replace with the standard emerald glow treatment (`radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, transparent 70%)`).
2. Fix the primary CTA: `rounded-full bg-[var(--emerald)] shadow-[0_10px_30px_rgba(16,185,129,0.3)]`.
3. Replace `#4ade80` savings amounts with `text-emerald-400` or `text-[var(--emerald)]`.
4. Replace `#818cf8` indigo accents with `text-indigo-400` (allowed for progress states per design spec, but only as Tailwind class, not hardcoded hex).
5. Add the standard glass card recipe to the comparison/results panel — it currently has a custom background not in the design system.

---

### `/recovery` — Retroactive Recovery Scanner
**Purpose:** Upload old NOA → AI finds missed credits → T1-ADJ guidance.  
**Components:** File dropzone, results accordion, opportunity cards, Framer Motion.

#### Violations
| Severity | Finding |
|----------|---------|
| **P0** | **Primary CTA button uses `rounded-2xl`**, not `rounded-full`. The "Scan for missed credits →" action is P0 because it's the main conversion action on the page. |
| P1 | **Hardcoded `#10B981`** throughout (10+ instances on buttons, icons, result highlights). |
| P1 | Upload dropzone has correct `tabular-nums` on amounts ✓ but result opportunity cards do not — add to credit value displays. |
| P2 | Success/opportunity card icons should be in the canonical icon cell (12×12px, `rounded-lg`, `bg-[var(--emerald-tint)]`, `ring-1 ring-[rgba(16,185,129,0.20)]`). |

#### Suggested improvements
1. **Immediately fix**: change CTA button `rounded-2xl` → `rounded-full` and add emerald glow shadow.
2. Replace `#10B981` hardcodes with `var(--emerald)`.
3. Add `tabular-nums` to credit value amounts in opportunity cards.
4. Ensure opportunity card icon cells match the canonical spec (emerald-tinted rounded-square cell).
5. Add an eyebrow ("RECOVERY OPPORTUNITIES") above the results section.

---

### `/filing-guide` — Filing Guide
**Purpose:** Personalised step-by-step T1 filing checklist generated from the user's assessment.  
**Components:** Progress bar, checklist steps, shadcn `Progress`, glass cards.

#### Violations
| Severity | Finding |
|----------|---------|
| P2 | **Hardcoded `#10B981`** in Tailwind class strings: `text-[#10B981]`, `border-[#10B981]`, `bg-[#10B981]` (6 instances). |
| P2 | Buttons correctly use `rounded-full` ✓. `tabular-nums` correctly applied ✓. Cards correct ✓. |

#### Suggested improvements
1. Replace `#10B981` class literals with `var(--emerald)` equivalents.
2. (Minor) Add `tracking-[0.15em]` to the step-number eyebrow labels if they exist.

---

### `/history` — Calculation History
**Purpose:** List of saved calculation snapshots with restore and comparison.  
**Components:** Date-filtered list, glass cards, shadcn `Badge`, restore button.

#### Violations
| Severity | Finding |
|----------|---------|
| P2 | **2 hardcoded `#10B981` instances** (lines 128–129) on amount highlights. |
| P2 | Otherwise well-implemented: `rounded-full` buttons ✓, `tabular-nums` ✓, glass cards ✓. |

#### Suggested improvements
1. Replace 2 hardcoded hex instances with `var(--emerald)`.
2. (Polish) History amount column could benefit from Geist Mono (`font-mono`) in addition to `tabular-nums`.

---

### `/settings` — Account Settings
**Purpose:** Profile, notification prefs, data export, danger zone.  
**Components:** Section cards, shadcn `Input`/`Switch`/`Button`, Framer Motion.

#### Violations
| Severity | Finding |
|----------|---------|
| P1 | **Inconsistent token usage** — CSS vars correctly used for text colours (`var(--text-primary)`, `var(--text-secondary)`) but emerald colour hardcoded on buttons and icons (`#10B981`, 5 instances). Should use vars everywhere. |
| P2 | Toggle/switch active colour should use `var(--emerald)` — verify shadcn `Switch` is themed via `globals.css`. |

#### Suggested improvements
1. Align the 5 hardcoded `#10B981` instances to use `var(--emerald)` — consistent with the text var usage already present.
2. Verify shadcn `Switch` active colour is set in `globals.css` via `--primary: var(--emerald)` mapping (not hardcoded per-component).
3. Add `tabular-nums` to any account stat displays (number of returns filed, storage used, etc.).

---

### `/privacy` + `/terms` — Legal Pages
**Purpose:** PIPEDA privacy policy and Terms of Service.  
**Components:** Minimal — text layout, section headers, links.

#### Violations
| Severity | Finding |
|----------|---------|
| P2 | Link colours hardcode `#10B981` (4 instances each). Should be `text-[var(--emerald)]`. |
| P2 | Otherwise minimal — no interactive components to audit. |

#### Suggested improvements
1. Replace `#10B981` link colours with `var(--emerald)` / `text-[var(--emerald)]`.
2. Add hover underline (`hover:underline`) to emerald links for accessibility.

---

### `/cpa/returns` — CPA Review Dashboard ✅ Benchmark
**Purpose:** CPA-facing client return management: stat cards, filter tabs, expandable return rows.  
**Components:** `CPAShell`, shadcn `Avatar`/`Badge`/`Button`/`Input`, native table, lucide-react.

#### Violations
| Severity | Finding |
|----------|---------|
| P2 | Button shadow uses hardcoded `rgba(16,185,129,0.25)` — minor; should be `shadow-[0_8px_20px_var(--emerald-glow)]` when CSS var shadow is available. |
| — | Everything else: `var(--emerald)` throughout ✓, `rounded-full` CTAs ✓, `tabular-nums` on all money ✓, `tracking-[0.15em]` eyebrows ✓, glass cards ✓, responsive ✓. |

> **This page is the current gold standard for design system compliance.** Use it as the reference when fixing other routes.

---

## Global Findings

### The One Root Cause
Almost every violation traces to one pattern: **`#10B981` was hardcoded early in development before the CSS token system was formalised.** The token `var(--emerald)` exists in `src/styles/tokens.css` but was never backfilled. A single find-replace pass on the codebase would close ~80% of P1 violations.

### Legitimate Exceptions (do not "fix" these)
- `AppShell.tsx` mobile nav: `#0a1628` and `#10B981` hardcoded — AppShell predates the token system; acceptable.
- `CPAShell.tsx` mobile nav: same pattern, intentional match.
- `globals.css` / `tokens.css` themselves: token definitions obviously contain hex values.

### What's Consistently Right
- **Glass card recipe** — `bg-white/[0.04]`, `border-white/[0.08]`, `backdrop-blur`, `rounded-2xl`, `shadow` — correctly applied on almost every page. ✓
- **`tabular-nums`** — present on calculated tax amounts on most app pages. ✓
- **`rounded-full` pill buttons** — correct on ~70% of pages; only dashboard, recovery, estimate, and family need fixing. ✓
- **Mobile responsiveness** — every page reviewed is mobile-first. ✓

---

## Fix Priority Queue

| # | Fix | Pages affected | Effort |
|---|-----|----------------|--------|
| 1 | Global `#10B981` → `var(--emerald)` find-replace | All 18 routes | Low |
| 2 | Global `#059669` → `var(--emerald-dark)` | 8 routes | Low |
| 3 | Dashboard CTA `rounded-xl` → `rounded-full` + glow | `/dashboard` | Low |
| 4 | Recovery CTA `rounded-2xl` → `rounded-full` + glow | `/recovery` | Low |
| 5 | Estimate CTA `rounded-2xl` → `rounded-full` + glow | `/estimate` | Low |
| 6 | Family optimizer: delete off-brand gradient palette | `/family` | Medium |
| 7 | Family primary CTA: pill + solid emerald | `/family` | Low |
| 8 | Eyebrow `tracking-widest` → `tracking-[0.15em]` | `/`, `/pricing`, `/for-cpas` | Low |
| 9 | Inline bg styles → CSS vars | All marketing routes | Low |
| 10 | Calculator inline colour conditionals → `var(--warning)` / `var(--error)` | `/calculator` | Low |
| 11 | Missing `tabular-nums` on slip OCR values | `/slips` | Low |
| 12 | Missing `tabular-nums` on estimate result amount | `/estimate` | Low |
