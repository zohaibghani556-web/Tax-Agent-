-- ============================================================
-- Stage 6C: profile-owned user_id/tax_year alignment
--
-- Purpose:
--   Add denormalized user_id and tax_year columns to profile-owned
--   tables that currently resolve ownership through profile_id.
--
-- Scope:
--   - Add nullable user_id and tax_year columns.
--   - Backfill both values from tax_profiles via profile_id.
--   - Add non-unique lookup indexes.
--   - Add nullable user_id foreign keys to auth.users.
--
-- Explicitly NOT included:
--   - No NOT NULL constraints. Stage 6D may add those only after
--     backups and prechecks pass.
--   - No RLS policy changes. Existing profile_id -> tax_profiles
--     join-based RLS remains canonical for this stage.
--   - No tax_slips changes. tax_slips.user_id backfill/code alignment
--     is tracked separately before any NOT NULL or user_id-only RLS work.
-- ============================================================

-- Add nullable columns

ALTER TABLE public.tax_calculations
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER;

ALTER TABLE public.deductions_credits
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER;

ALTER TABLE public.business_income
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER;

ALTER TABLE public.rental_income
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER;

COMMENT ON COLUMN public.tax_calculations.user_id IS
  'Stage 6C denormalized owner from tax_profiles.user_id; nullable until Stage 6D.';
COMMENT ON COLUMN public.tax_calculations.tax_year IS
  'Stage 6C denormalized tax year from tax_profiles.tax_year; nullable until Stage 6D.';

COMMENT ON COLUMN public.deductions_credits.user_id IS
  'Stage 6C denormalized owner from tax_profiles.user_id; nullable until Stage 6D.';
COMMENT ON COLUMN public.deductions_credits.tax_year IS
  'Stage 6C denormalized tax year from tax_profiles.tax_year; nullable until Stage 6D.';

COMMENT ON COLUMN public.chat_messages.user_id IS
  'Stage 6C denormalized owner from tax_profiles.user_id; nullable until Stage 6D.';
COMMENT ON COLUMN public.chat_messages.tax_year IS
  'Stage 6C denormalized tax year from tax_profiles.tax_year; nullable until Stage 6D.';

COMMENT ON COLUMN public.business_income.user_id IS
  'Stage 6C denormalized owner from tax_profiles.user_id; nullable until Stage 6D.';
COMMENT ON COLUMN public.business_income.tax_year IS
  'Stage 6C denormalized tax year from tax_profiles.tax_year; nullable until Stage 6D.';

COMMENT ON COLUMN public.rental_income.user_id IS
  'Stage 6C denormalized owner from tax_profiles.user_id; nullable until Stage 6D.';
COMMENT ON COLUMN public.rental_income.tax_year IS
  'Stage 6C denormalized tax year from tax_profiles.tax_year; nullable until Stage 6D.';

-- Backfill from canonical filing context

UPDATE public.tax_calculations t
SET
  user_id = p.user_id,
  tax_year = p.tax_year
FROM public.tax_profiles p
WHERE p.id = t.profile_id
  AND (t.user_id IS DISTINCT FROM p.user_id OR t.tax_year IS DISTINCT FROM p.tax_year);

UPDATE public.deductions_credits t
SET
  user_id = p.user_id,
  tax_year = p.tax_year
FROM public.tax_profiles p
WHERE p.id = t.profile_id
  AND (t.user_id IS DISTINCT FROM p.user_id OR t.tax_year IS DISTINCT FROM p.tax_year);

UPDATE public.chat_messages t
SET
  user_id = p.user_id,
  tax_year = p.tax_year
FROM public.tax_profiles p
WHERE p.id = t.profile_id
  AND (t.user_id IS DISTINCT FROM p.user_id OR t.tax_year IS DISTINCT FROM p.tax_year);

UPDATE public.business_income t
SET
  user_id = p.user_id,
  tax_year = p.tax_year
FROM public.tax_profiles p
WHERE p.id = t.profile_id
  AND (t.user_id IS DISTINCT FROM p.user_id OR t.tax_year IS DISTINCT FROM p.tax_year);

UPDATE public.rental_income t
SET
  user_id = p.user_id,
  tax_year = p.tax_year
FROM public.tax_profiles p
WHERE p.id = t.profile_id
  AND (t.user_id IS DISTINCT FROM p.user_id OR t.tax_year IS DISTINCT FROM p.tax_year);

-- Non-unique indexes for future direct lookup paths

CREATE INDEX IF NOT EXISTS idx_tax_calculations_user_year
  ON public.tax_calculations (user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_profile_year
  ON public.tax_calculations (profile_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_deductions_credits_user_year
  ON public.deductions_credits (user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_deductions_credits_profile_year
  ON public.deductions_credits (profile_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_year
  ON public.chat_messages (user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_chat_messages_profile_year
  ON public.chat_messages (profile_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_business_income_user_year
  ON public.business_income (user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_business_income_profile_year
  ON public.business_income (profile_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_rental_income_user_year
  ON public.rental_income (user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_rental_income_profile_year
  ON public.rental_income (profile_id, tax_year);

-- Nullable FKs to auth.users
-- NOT VALID avoids requiring a full-table validation at constraint creation.
-- VALIDATE is safe after Stage 6C preflight confirmed no orphaned profiles
-- and no missing tax_profiles.user_id values. Each block is idempotent so
-- a partially-applied migration can be rerun safely.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tax_calculations_user_id_fkey'
      AND conrelid = 'public.tax_calculations'::regclass
  ) THEN
    ALTER TABLE public.tax_calculations
      ADD CONSTRAINT tax_calculations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deductions_credits_user_id_fkey'
      AND conrelid = 'public.deductions_credits'::regclass
  ) THEN
    ALTER TABLE public.deductions_credits
      ADD CONSTRAINT deductions_credits_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_user_id_fkey'
      AND conrelid = 'public.chat_messages'::regclass
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_income_user_id_fkey'
      AND conrelid = 'public.business_income'::regclass
  ) THEN
    ALTER TABLE public.business_income
      ADD CONSTRAINT business_income_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rental_income_user_id_fkey'
      AND conrelid = 'public.rental_income'::regclass
  ) THEN
    ALTER TABLE public.rental_income
      ADD CONSTRAINT rental_income_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tax_calculations_user_id_fkey'
      AND conrelid = 'public.tax_calculations'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.tax_calculations
      VALIDATE CONSTRAINT tax_calculations_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deductions_credits_user_id_fkey'
      AND conrelid = 'public.deductions_credits'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.deductions_credits
      VALIDATE CONSTRAINT deductions_credits_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_user_id_fkey'
      AND conrelid = 'public.chat_messages'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.chat_messages
      VALIDATE CONSTRAINT chat_messages_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_income_user_id_fkey'
      AND conrelid = 'public.business_income'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.business_income
      VALIDATE CONSTRAINT business_income_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rental_income_user_id_fkey'
      AND conrelid = 'public.rental_income'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.rental_income
      VALIDATE CONSTRAINT rental_income_user_id_fkey;
  END IF;
END $$;
