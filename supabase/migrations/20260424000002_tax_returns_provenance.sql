-- ============================================================
-- tax_returns table with provenance_records JSONB column
--
-- Stores computed tax return results alongside provenance records
-- so every field on a return is traceable to its source without
-- recomputation. Provenance is TaxAgent's core differentiator.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year INT NOT NULL DEFAULT 2025,

  -- Engine inputs (stored for reproducibility)
  engine_mode TEXT NOT NULL CHECK (engine_mode IN ('slips', 'flat')),

  -- Computed results (JSON — full TaxCalculationResult or TaxBreakdown)
  result JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Provenance: every computed field traced to its source
  -- Array of ProvenanceRecord objects (see docs/architecture/provenance.md)
  provenance_records JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One return per user per tax year per mode
  UNIQUE (user_id, tax_year, engine_mode)
);

-- GIN index on provenance_records for querying specific field_ids
-- e.g., SELECT * FROM tax_returns WHERE provenance_records @> '[{"field_id": "line_10100"}]';
CREATE INDEX IF NOT EXISTS idx_tax_returns_provenance
  ON public.tax_returns USING GIN (provenance_records);

-- Standard index for user lookups
CREATE INDEX IF NOT EXISTS idx_tax_returns_user_year
  ON public.tax_returns (user_id, tax_year);

-- RLS: users can only access their own returns
ALTER TABLE public.tax_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tax returns"
  ON public.tax_returns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tax returns"
  ON public.tax_returns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax returns"
  ON public.tax_returns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax returns"
  ON public.tax_returns FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tax_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_returns_updated_at
  BEFORE UPDATE ON public.tax_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tax_returns_updated_at();
