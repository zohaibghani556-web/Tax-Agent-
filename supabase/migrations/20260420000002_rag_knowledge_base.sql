-- ============================================================
-- TaxAgent.ai — RAG Knowledge Base: table + similarity search RPC
-- Migration: 20260420000002_rag_knowledge_base
--
-- Creates the tax_knowledge table (seeded separately via
-- scripts/seed-knowledge-base.ts) and the match_tax_knowledge
-- RPC function used by src/lib/rag/embed.ts on every chat message.
--
-- Embedding model: Supabase/gte-small (384 dimensions).
-- Similarity metric: cosine distance (<=>), converted to similarity
-- as (1 - distance) per pgvector convention.
--
-- RLS: tax_knowledge is non-sensitive reference data.
-- All authenticated users (and anon for the viral estimator) may
-- read. Only the service role may write (seeding script runs as
-- service role).
-- ============================================================

-- pgvector must be enabled first; this is a no-op if already active.
CREATE EXTENSION IF NOT EXISTS vector;

-- ── tax_knowledge table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tax_knowledge (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text        NOT NULL,
  source     text        NOT NULL,
  category   text        NOT NULL,
  -- 384-dim vector from Supabase/gte-small (mean-pooled, L2-normalised)
  embedding  vector(384) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- IVFFlat index for approximate nearest-neighbour search.
-- lists=100 is appropriate for a small knowledge base (~20 entries).
-- Rebuild with higher lists if the table grows beyond ~10 000 rows.
CREATE INDEX IF NOT EXISTS tax_knowledge_embedding_idx
  ON public.tax_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Unique constraint required by scripts/seed-knowledge-base.ts.
-- The seed script upserts on onConflict: 'source,category' to allow
-- safe re-runs without duplicating entries.
ALTER TABLE public.tax_knowledge
  ADD CONSTRAINT IF NOT EXISTS tax_knowledge_source_category_unique
  UNIQUE (source, category);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.tax_knowledge ENABLE ROW LEVEL SECURITY;

-- Authenticated users and anon callers may read knowledge entries.
DROP POLICY IF EXISTS "tax_knowledge: public read" ON public.tax_knowledge;
CREATE POLICY "tax_knowledge: public read"
  ON public.tax_knowledge
  FOR SELECT
  USING (true);

-- Writes are service-role only (seeding script). No INSERT/UPDATE
-- policy is needed because the service role bypasses RLS.

-- ── match_tax_knowledge RPC ───────────────────────────────────
--
-- Called from src/lib/rag/embed.ts: retrieveRelevantKnowledge()
-- Returns the top match_count knowledge chunks whose cosine
-- similarity to query_embedding exceeds match_threshold.
--
-- Parameters must match the TypeScript call exactly:
--   supabase.rpc('match_tax_knowledge', {
--     query_embedding: number[],
--     match_threshold: number,   -- e.g. 0.75
--     match_count:     number,   -- e.g. 6
--   })

CREATE OR REPLACE FUNCTION public.match_tax_knowledge(
  query_embedding  vector(384),
  match_threshold  float,
  match_count      int
)
RETURNS TABLE (
  id         uuid,
  content    text,
  source     text,
  category   text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tk.id,
    tk.content,
    tk.source,
    tk.category,
    -- cosine similarity = 1 − cosine distance
    (1 - (tk.embedding <=> query_embedding))::float AS similarity
  FROM public.tax_knowledge tk
  WHERE (1 - (tk.embedding <=> query_embedding)) >= match_threshold
  ORDER BY tk.embedding <=> query_embedding  -- ascending distance = descending similarity
  LIMIT match_count;
END;
$$;
