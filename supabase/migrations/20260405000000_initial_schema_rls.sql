-- TaxAgent.ai — Initial Schema + Row-Level Security
-- Migration: 20260405000000_initial_schema_rls
--
-- Every table that stores user data MUST have RLS enabled with a policy
-- restricting access to the owning user_id. This is verified in CI.
-- Reference: CLAUDE.md Security Checklist

-- ============================================================
-- TAX PROFILES
-- Stores the user's personal tax situation for a given tax year.
-- One row per (user_id, tax_year).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year             SMALLINT    NOT NULL DEFAULT 2025,
  legal_name           TEXT        NOT NULL CHECK (char_length(legal_name) BETWEEN 1 AND 200),
  date_of_birth        DATE        NOT NULL,
  marital_status       TEXT        NOT NULL CHECK (marital_status IN (
                         'single','married','common-law','separated','divorced','widowed'
                       )),
  province             TEXT        NOT NULL DEFAULT 'ON' CHECK (province = 'ON'),
  residency_status     TEXT        NOT NULL CHECK (residency_status IN (
                         'citizen','permanent-resident','deemed-resident','newcomer','non-resident'
                       )),
  residency_start_date DATE,
  dependants           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  assessment_complete  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, tax_year)
);

ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

-- Users may only read/write their own profile rows.
CREATE POLICY "tax_profiles: owner access only"
  ON public.tax_profiles
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TAX SLIPS
-- Stores individual tax slips (T4, T5, etc.) per user/year.
-- Slip data stored as JSONB — schema validated at app layer.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_slips (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year     SMALLINT    NOT NULL DEFAULT 2025,
  slip_type    TEXT        NOT NULL CHECK (slip_type IN (
                 'T4','T5','T5008','T3','T4A','T2202','T4E','T5007'
               )),
  issuer_name  TEXT        NOT NULL DEFAULT '' CHECK (char_length(issuer_name) <= 200),
  data         JSONB       NOT NULL,
  entered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_slips: owner access only"
  ON public.tax_slips
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by user + year (used on calculator and dashboard load)
CREATE INDEX IF NOT EXISTS tax_slips_user_year_idx
  ON public.tax_slips (user_id, tax_year);

-- ============================================================
-- TAX CALCULATIONS
-- Cached TaxCalculationResult per user/year.
-- Re-computed on demand; this is a cache, not a source of truth.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_calculations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year        SMALLINT    NOT NULL DEFAULT 2025,
  result          JSONB       NOT NULL,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, tax_year)
);

ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_calculations: owner access only"
  ON public.tax_calculations
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FILING GUIDES
-- Claude-generated filing guides, cached per user/year.
-- Re-generated on user request; stale after slip changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.filing_guides (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year      SMALLINT    NOT NULL DEFAULT 2025,
  guide         JSONB       NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, tax_year)
);

ALTER TABLE public.filing_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "filing_guides: owner access only"
  ON public.filing_guides
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DEDUCTIONS INPUT
-- Stores DeductionsCreditsInput per user/year.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_deductions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year   SMALLINT    NOT NULL DEFAULT 2025,
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, tax_year)
);

ALTER TABLE public.tax_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_deductions: owner access only"
  ON public.tax_deductions
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CHAT MESSAGES
-- Conversation history for the tax assessment chat.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year   SMALLINT    NOT NULL DEFAULT 2025,
  role       TEXT        NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT        NOT NULL CHECK (char_length(content) <= 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages: owner access only"
  ON public.chat_messages
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_user_year_idx
  ON public.chat_messages (user_id, tax_year, created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Auto-set updated_at on row changes (used by tax_profiles).
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tax_profiles_set_updated_at
  BEFORE UPDATE ON public.tax_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tax_deductions_set_updated_at
  BEFORE UPDATE ON public.tax_deductions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
