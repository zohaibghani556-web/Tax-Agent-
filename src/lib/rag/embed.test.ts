/**
 * RAG pipeline unit tests — src/lib/rag/embed.ts
 *
 * These tests validate the retrieval and error-handling logic of
 * retrieveRelevantKnowledge() without hitting a real database.
 *
 * Integration note:
 *   To validate against a real Supabase instance, run the seeding script
 *   first (scripts/seed-knowledge-base.ts) then test with actual env vars.
 *   The migration 20260420000002_rag_knowledge_base.sql must be applied.
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import { retrieveRelevantKnowledge } from './embed';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mock @xenova/transformers so the model is never downloaded in CI.
// embedText() will be replaced per-test where needed.
// ---------------------------------------------------------------------------
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(
    vi.fn().mockResolvedValue({
      // Return a 384-element Float32Array of zeros (shape matches gte-small)
      data: new Float32Array(384).fill(0.1),
    })
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RpcResult = { data: unknown; error: { message: string } | null };

function makeSupabase(rpcResult: RpcResult): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('retrieveRelevantKnowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls match_tax_knowledge with the correct argument shape', async () => {
    const supabase = makeSupabase({ data: [], error: null });
    const rpcSpy = supabase.rpc as unknown as MockInstance;

    await retrieveRelevantKnowledge('What is the RRSP limit?', supabase);

    expect(rpcSpy).toHaveBeenCalledOnce();
    const [rpcName, rpcArgs] = rpcSpy.mock.calls[0] as [string, Record<string, unknown>];

    expect(rpcName).toBe('match_tax_knowledge');
    expect(rpcArgs).toMatchObject({
      match_threshold: 0.75,
      match_count: 6,
    });
    // embedding must be an array of numbers with 384 elements
    expect(Array.isArray(rpcArgs.query_embedding)).toBe(true);
    expect((rpcArgs.query_embedding as number[]).length).toBe(384);
    expect(typeof (rpcArgs.query_embedding as number[])[0]).toBe('number');
  });

  it('maps RPC rows to KnowledgeChunk correctly', async () => {
    const rows = [
      {
        id: 'abc-123',
        content: 'RRSP limit 2025 is $32,490',
        source: 'CRA T4040',
        category: 'rrsp',
        similarity: 0.91,
      },
      {
        id: 'def-456',
        content: 'Basic Personal Amount is $16,129',
        source: 'CRA Schedule 1',
        category: 'basic_personal_amount',
        similarity: 0.82,
      },
    ];

    const supabase = makeSupabase({ data: rows, error: null });
    const chunks = await retrieveRelevantKnowledge('RRSP', supabase);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({
      id: 'abc-123',
      content: 'RRSP limit 2025 is $32,490',
      source: 'CRA T4040',
      category: 'rrsp',
      similarity: 0.91,
    });
    expect(chunks[1].id).toBe('def-456');
  });

  it('returns [] and does not throw when the RPC returns an error', async () => {
    const supabase = makeSupabase({
      data: null,
      error: { message: 'relation "tax_knowledge" does not exist' },
    });

    // Should not throw — RAG failure is non-fatal (chat continues without it)
    const chunks = await retrieveRelevantKnowledge('some query', supabase);
    expect(chunks).toEqual([]);
  });

  it('returns [] when RPC returns null data', async () => {
    const supabase = makeSupabase({ data: null, error: null });
    const chunks = await retrieveRelevantKnowledge('some query', supabase);
    expect(chunks).toEqual([]);
  });

  it('returns [] when RPC returns empty array', async () => {
    const supabase = makeSupabase({ data: [], error: null });
    const chunks = await retrieveRelevantKnowledge('obscure topic', supabase);
    expect(chunks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Structural contract test: KnowledgeEntry fields match the DB column names
// in match_tax_knowledge (migration 20260420000002_rag_knowledge_base.sql)
// ---------------------------------------------------------------------------
describe('KnowledgeChunk schema contract', () => {
  it('required fields id/content/source/category/similarity are present on retrieved chunks', async () => {
    const row = {
      id: 'xyz',
      content: 'test content',
      source: 'CRA source',
      category: 'test',
      similarity: 0.9,
    };
    const supabase = makeSupabase({ data: [row], error: null });
    const [chunk] = await retrieveRelevantKnowledge('test', supabase);

    // These keys must match the RETURNS TABLE in match_tax_knowledge SQL.
    expect(chunk).toHaveProperty('id');
    expect(chunk).toHaveProperty('content');
    expect(chunk).toHaveProperty('source');
    expect(chunk).toHaveProperty('category');
    expect(chunk).toHaveProperty('similarity');
  });
});
