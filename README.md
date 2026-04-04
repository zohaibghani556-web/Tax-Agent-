# TaxAgent.ai

AI-powered Canadian tax filing guidance for the 2025 tax year.

---

## Project structure

```
src/
├── app/                    # All pages and API routes (Next.js App Router)
│   ├── page.tsx            # Landing page ✅
│   ├── layout.tsx          # Global header/footer ✅
│   ├── onboarding/         # Tax assessment flow (TODO: primary account)
│   ├── dashboard/          # User dashboard (TODO: primary account)
│   ├── slips/              # Slip upload UI (TODO: primary account)
│   ├── calculator/         # Refund estimator (TODO: primary account)
│   ├── filing-guide/       # Step-by-step guide (TODO: primary account)
│   ├── privacy/            # Privacy Policy ✅
│   ├── terms/              # Terms of Service ✅
│   └── api/
│       ├── chat/route.ts   # Claude API endpoint (skeleton ✅)
│       ├── calculate/      # Tax calculation endpoint (skeleton ✅)
│       └── ocr/            # Slip OCR endpoint (skeleton ✅)
├── lib/
│   ├── supabase/           # Supabase client helpers ✅
│   ├── tax-engine/         # ← PRIMARY ACCOUNT writes this
│   │   ├── constants.ts    # ← PRIMARY ACCOUNT provides
│   │   ├── types.ts        # ← PRIMARY ACCOUNT provides
│   │   ├── federal/        # Federal tax calculations
│   │   ├── ontario/        # Ontario tax calculations
│   │   └── corporate/      # Corporate tax calculations
│   ├── slips/              # Slip parsers (TODO: primary account)
│   ├── ai/                 # Claude prompt templates (TODO: primary account)
│   ├── scenarios/          # Tax scenario logic (TODO: primary account)
│   └── utils/
│       ├── currency.ts     # formatCAD, roundCRA, formatPercent ✅
│       ├── validation.ts   # isValidSIN, maskSIN, isValidAmount ✅
│       └── date.ts         # getAge, isSenior, daysResident, proRateForNewcomer ✅
├── components/
│   ├── chat/               # Chat UI components (TODO: primary account)
│   ├── slips/              # Slip upload components (TODO: primary account)
│   ├── calculator/         # Calculator widgets (TODO: primary account)
│   └── forms/              # Form components (TODO: primary account)
└── hooks/                  # Custom React hooks (TODO: primary account)

tests/
├── tax-engine/             # Unit tests for tax logic (TODO: primary account)
└── scenarios/              # Integration tests for scenarios (TODO: primary account)
```

---

## First-time setup (no coding experience required)

### Step 1 — Install Node.js
Download and install Node.js from **https://nodejs.org** — choose the **LTS** version.

### Step 2 — Open a terminal in this folder
- **Mac**: Right-click the folder → "Open Terminal Here" (or open Terminal and drag the folder in)
- **Windows**: Right-click the folder → "Open in Terminal"

### Step 3 — Run the setup script
```bash
bash setup.sh
```
This installs all dependencies automatically.

### Step 4 — Fill in your API keys
Open `.env.local` in any text editor (even Notepad) and replace the placeholder values:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

### Step 5 — Start the development server
```bash
npm run dev
```

Open **http://localhost:3000** in your browser. You should see the landing page.

---

## Adding the tax engine files

Once the primary account provides `constants.ts` and `types.ts`, place them here:
- `src/lib/tax-engine/constants.ts`
- `src/lib/tax-engine/types.ts`

The utility functions in `src/lib/utils/date.ts` import from `constants.ts` — everything will work once those files are in place.

---

## Available commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Build for production |
| `npm run lint` | Check for code errors |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once and exit |

---

## Tech stack

- **Next.js 15** (App Router) — the web framework
- **TypeScript** — type-safe JavaScript
- **Tailwind CSS** — utility-first styling
- **Supabase** — database and authentication (Canadian region)
- **Anthropic Claude** — AI tax assessment
- **Vitest** — unit testing

---

## Compliance notes

- Privacy Policy is PIPEDA-compliant (see `src/app/privacy/page.tsx`)
- Terms of Service include CRA non-affiliation disclaimer
- SIN masking is implemented in `src/lib/utils/validation.ts`
- All data storage is configured for Canadian servers
