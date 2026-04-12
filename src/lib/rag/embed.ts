/**
 * TaxAgent.ai — RAG embedding + retrieval
 *
 * Uses @xenova/transformers with Supabase/gte-small (384 dimensions).
 * Singleton pattern: the model is downloaded once and reused across requests
 * to avoid repeated cold-load overhead in serverless environments.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { KnowledgeChunk } from './types';

// --------------------------------------------------------------------------
// Singleton pipeline — lazily initialized on first call
// --------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any | null = null;

async function getPipeline() {
  if (_pipeline) return _pipeline;

  // Dynamic import keeps @xenova/transformers out of the SSR bundle on pages
  // that don't use RAG. Node.js only — this code runs in API routes.
  const { pipeline } = await import('@xenova/transformers');
  _pipeline = await pipeline('feature-extraction', 'Supabase/gte-small');
  return _pipeline;
}

// --------------------------------------------------------------------------
// embedText
// --------------------------------------------------------------------------

/**
 * Converts a text string into a 384-dimensional embedding vector.
 * Pooling strategy: mean pooling with L2 normalization (matches gte-small training).
 */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });

  // output.data is a Float32Array — convert to plain number[]
  return Array.from(output.data as Float32Array);
}

// --------------------------------------------------------------------------
// retrieveRelevantKnowledge
// --------------------------------------------------------------------------

/**
 * Embeds the query, then calls the match_tax_knowledge RPC in Supabase.
 * Returns up to 6 knowledge chunks with similarity > 0.75.
 *
 * Failure is intentionally non-fatal: returns [] so the chat route can
 * continue without RAG rather than crash.
 */
export async function retrieveRelevantKnowledge(
  query: string,
  supabase: SupabaseClient,
): Promise<KnowledgeChunk[]> {
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc('match_tax_knowledge', {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 6,
  });

  if (error) {
    console.error('[RAG] match_tax_knowledge error:', error.message);
    return [];
  }

  return (data ?? []) as KnowledgeChunk[];
}
