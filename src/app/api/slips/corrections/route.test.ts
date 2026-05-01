import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockLog = vi.fn();

const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@/lib/csrf', () => ({ validateCsrfToken: () => true }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => true }));
vi.mock('@/lib/logger', () => ({ log: (...args: unknown[]) => mockLog(...args) }));

import { POST } from './route';

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/slips/corrections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeExtractionSelect(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

function makeProfileSelect(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

function makeTaxSlipsSelect(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(async () => result),
  };
  return chain;
}

function makeTaxSlipsDelete(result: unknown) {
  const chain = {
    delete: vi.fn(() => chain),
    eq: vi.fn(async () => result),
  };
  return chain;
}

function makeTaxSlipsInsert(result: unknown) {
  return {
    insert: vi.fn(async () => result),
  };
}

function makeReviewedUpdate(result: unknown) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

function makeCorrectionsInsert(result: unknown) {
  return {
    insert: vi.fn(async () => result),
  };
}

const BODY = {
  extractionId: '45bc7662-4b65-4219-a4ec-985b4f588090',
  slipType: 'T4A',
  issuerName: 'Example issuer',
  taxYear: 2025,
  correctedBoxes: { box105: 1000 },
  corrections: [],
};

describe('/api/slips/corrections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
  });

  it('marks the extraction reviewed before returning ok when there are no field corrections', async () => {
    const extractionSelect = makeExtractionSelect({
      data: { id: BODY.extractionId, user_id: 'user-123', file_hash: 'hash-123' },
      error: null,
    });
    const reviewedUpdate = makeReviewedUpdate({
      data: { id: BODY.extractionId },
      error: null,
    });
    const reviewVerify = makeExtractionSelect({
      data: { id: BODY.extractionId, reviewed_by_user_at: '2026-05-01T00:00:00.000Z' },
      error: null,
    });
    const profileSelect = makeProfileSelect({
      data: { id: 'profile-123', tax_year: 2025 },
      error: null,
    });
    const taxSlipsSelect = makeTaxSlipsSelect({
      data: [],
      error: null,
    });
    const taxSlipsDelete = makeTaxSlipsDelete({ error: null });
    const taxSlipsInsert = makeTaxSlipsInsert({ error: null });

    mockFrom
      .mockReturnValueOnce(extractionSelect)
      .mockReturnValueOnce(reviewedUpdate)
      .mockReturnValueOnce(reviewVerify)
      .mockReturnValueOnce(profileSelect)
      .mockReturnValueOnce(taxSlipsSelect)
      .mockReturnValueOnce(taxSlipsDelete)
      .mockReturnValueOnce(taxSlipsInsert);

    const res = await POST(makeRequest(BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reviewedAt).toEqual(expect.any(String));
    expect(json.slips).toHaveLength(1);
    expect(json.slips[0]).toEqual(expect.objectContaining({
      type: 'T4A',
      source: 'ocr',
      fileHash: 'hash-123',
      sourceExtractionId: BODY.extractionId,
    }));
    expect(reviewedUpdate.update).toHaveBeenCalledWith({
      reviewed_by_user_at: expect.any(String),
    });
    expect(reviewedUpdate.eq).toHaveBeenCalledWith('id', BODY.extractionId);
    expect(reviewedUpdate.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(taxSlipsDelete.eq).toHaveBeenCalledWith('profile_id', 'profile-123');
    expect(taxSlipsInsert.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-123',
        profile_id: 'profile-123',
        slip_type: 'T4A',
        source: 'ocr',
        tax_year: 2025,
        file_hash: 'hash-123',
        source_extraction_id: BODY.extractionId,
      }),
    ]);
    expect(mockFrom).not.toHaveBeenCalledWith('slip_corrections');
  });

  it('returns 500 when the extraction cannot be marked reviewed', async () => {
    const extractionSelect = makeExtractionSelect({
      data: { id: BODY.extractionId, user_id: 'user-123' },
      error: null,
    });
    const correctionsInsert = makeCorrectionsInsert({ error: null });
    const reviewedUpdate = makeReviewedUpdate({
      data: null,
      error: { message: 'RLS denied update' },
    });

    mockFrom
      .mockReturnValueOnce(extractionSelect)
      .mockReturnValueOnce(correctionsInsert)
      .mockReturnValueOnce(reviewedUpdate);

    const res = await POST(makeRequest({
      ...BODY,
      corrections: [
        { fieldName: 'box105', originalValue: null, correctedValue: '1000' },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Could not mark extraction reviewed');
    expect(correctionsInsert.insert).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      'warn',
      'corrections.mark_reviewed_failed',
      expect.objectContaining({
        extractionId: BODY.extractionId,
        reason: 'RLS denied update',
      }),
    );
  });

  it('returns 500 when the reviewed timestamp is not visible after update', async () => {
    const extractionSelect = makeExtractionSelect({
      data: { id: BODY.extractionId, user_id: 'user-123', file_hash: 'hash-123' },
      error: null,
    });
    const reviewedUpdate = makeReviewedUpdate({
      data: { id: BODY.extractionId },
      error: null,
    });
    const reviewVerify = makeExtractionSelect({
      data: { id: BODY.extractionId, reviewed_by_user_at: null },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(extractionSelect)
      .mockReturnValueOnce(reviewedUpdate)
      .mockReturnValueOnce(reviewVerify);

    const res = await POST(makeRequest(BODY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Could not verify extraction review status');
    expect(mockFrom).not.toHaveBeenCalledWith('tax_slips');
    expect(mockLog).toHaveBeenCalledWith(
      'warn',
      'corrections.review_write_not_visible',
      expect.objectContaining({
        extractionId: BODY.extractionId,
        reason: 'reviewed_by_user_at still null after update',
      }),
    );
  });
});
