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
      data: { id: BODY.extractionId, user_id: 'user-123' },
      error: null,
    });
    const reviewedUpdate = makeReviewedUpdate({
      data: { id: BODY.extractionId },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(extractionSelect)
      .mockReturnValueOnce(reviewedUpdate);

    const res = await POST(makeRequest(BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reviewedAt).toEqual(expect.any(String));
    expect(reviewedUpdate.update).toHaveBeenCalledWith({
      reviewed_by_user_at: expect.any(String),
    });
    expect(reviewedUpdate.eq).toHaveBeenCalledWith('id', BODY.extractionId);
    expect(reviewedUpdate.eq).toHaveBeenCalledWith('user_id', 'user-123');
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
});
