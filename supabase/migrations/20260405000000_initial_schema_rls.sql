-- ============================================================
-- TaxAgent.ai — RLS Policies
-- Migration: 20260405000000_initial_schema_rls
--
-- Enables Row-Level Security on all user-data tables and creates
-- owner-only access policies.
--
-- Schema pattern:
--   tax_profiles  → user_id  = auth.uid()  (direct FK to auth.users)
--   audit_log     → user_id  = auth.uid()  (direct, SELECT only)
--   all others    → profile_id → tax_profiles.user_id = auth.uid()
--
-- Use DROP POLICY IF EXISTS before each CREATE so this script is
-- safe to re-run after partial failures.
-- ============================================================

-- ── tax_profiles ─────────────────────────────────────────────
-- Has user_id directly — simplest policy.

ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_profiles: owner access only" ON public.tax_profiles;
CREATE POLICY "tax_profiles: owner access only"
  ON public.tax_profiles
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── tax_slips ─────────────────────────────────────────────────
-- profile_id → tax_profiles.id; ownership resolved via join.

ALTER TABLE public.tax_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_slips: owner access only" ON public.tax_slips;
CREATE POLICY "tax_slips: owner access only"
  ON public.tax_slips
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = tax_slips.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = tax_slips.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- ── tax_calculations ──────────────────────────────────────────

ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_calculations: owner access only" ON public.tax_calculations;
CREATE POLICY "tax_calculations: owner access only"
  ON public.tax_calculations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = tax_calculations.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = tax_calculations.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- ── deductions_credits ────────────────────────────────────────

ALTER TABLE public.deductions_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deductions_credits: owner access only" ON public.deductions_credits;
CREATE POLICY "deductions_credits: owner access only"
  ON public.deductions_credits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = deductions_credits.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = deductions_credits.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- ── business_income ───────────────────────────────────────────

ALTER TABLE public.business_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_income: owner access only" ON public.business_income;
CREATE POLICY "business_income: owner access only"
  ON public.business_income
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = business_income.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = business_income.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- ── rental_income ─────────────────────────────────────────────

ALTER TABLE public.rental_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rental_income: owner access only" ON public.rental_income;
CREATE POLICY "rental_income: owner access only"
  ON public.rental_income
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = rental_income.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = rental_income.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- ── chat_messages ─────────────────────────────────────────────

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages: owner access only" ON public.chat_messages;
CREATE POLICY "chat_messages: owner access only"
  ON public.chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = chat_messages.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tax_profiles p
      WHERE p.id = chat_messages.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- ── audit_log ─────────────────────────────────────────────────
-- Has user_id directly. Users may only READ their own audit entries.
-- All writes go through the service role (server-side only).

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log: owner read only" ON public.audit_log;
CREATE POLICY "audit_log: owner read only"
  ON public.audit_log
  FOR SELECT
  USING (auth.uid() = user_id);
