import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { PipelineResult } from '@/lib/extraction/types';

const mockGetUser = vi.fn();
const mockUpload = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockExtractSlip = vi.fn();
const mockValidateCsrfToken = vi.fn();
const mockCheckRateLimit = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  storage: {
    from: vi.fn(() => ({ upload: mockUpload })),
  },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/extraction', () => ({
  extractSlip: (...args: unknown[]) => mockExtractSlip(...args),
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: (...args: unknown[]) => mockValidateCsrfToken(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('@/lib/logger', () => ({ log: vi.fn() }));

import { POST } from './route';

const pipelineResult: PipelineResult = {
  status: 'success',
  classification: {
    slipType: 't4',
    confidence: 1,
    notes: 'User-selected slip type',
  },
  extraction: {
    metadata: {
      issuerName: { value: 'Employer Inc.', confidence: 0.99 },
      taxYear: { value: 2025, confidence: 0.99 },
    },
    fields: {
      box14: { value: 50000, confidence: 0.99 },
      box22: { value: 7000, confidence: 0.99 },
    },
  },
  validation: {
    valid: true,
    flags: [],
  },
  boxes: {
    box14: 50000,
    box22: 7000,
  },
  slipType: 'T4',
  issuerName: 'Employer Inc.',
  taxYear: 2025,
  summary: 'T4 from Employer Inc. (2025). box14: $50,000.00, box22: $7,000.00',
  rawModelResponses: {
    classification: null,
    extraction: { model: 'test', response: '{}' },
  },
  usage: {
    classificationInputTokens: 0,
    classificationOutputTokens: 0,
    extractionInputTokens: 10,
    extractionOutputTokens: 5,
  },
};

function makeRequest(options: { file?: File; slipType?: string } = {}): NextRequest {
  const form = new FormData();
  form.append('file', options.file ?? new File(['fake-slip'], 't4.png', { type: 'image/png' }));
  if (options.slipType !== undefined) {
    form.append('slipType', options.slipType);
  }

  return new NextRequest('http://localhost/api/ocr', {
    method: 'POST',
    body: form,
  });
}

describe('/api/ocr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockValidateCsrfToken.mockReturnValue(true);
    mockCheckRateLimit.mockReturnValue(true);
    mockUpload.mockResolvedValue({ error: null });
    mockSingle.mockResolvedValue({ data: { id: 'extraction-123' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockExtractSlip.mockResolvedValue(pipelineResult);
  });

  it('rejects unauthenticated OCR requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(mockExtractSlip).not.toHaveBeenCalled();
  });

  it('rejects invalid manual slip types before extraction', async () => {
    const res = await POST(makeRequest({ slipType: 'w2' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid slip type: w2' });
    expect(mockExtractSlip).not.toHaveBeenCalled();
  });

  it('runs extraction, persists the OCR row, and returns a client-safe response', async () => {
    const res = await POST(makeRequest({ slipType: 't4' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockExtractSlip).toHaveBeenCalledWith({
      base64: Buffer.from('fake-slip').toString('base64'),
      mediaType: 'image/png',
      manualSlipType: 't4',
    });
    expect(mockFrom).toHaveBeenCalledWith('slip_extractions');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        slip_type_detected: 'T4',
        status: 'success',
        boxes: { box14: 50000, box22: 7000 },
        file_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(body).toEqual(
      expect.objectContaining({
        status: 'success',
        slipType: 'T4',
        issuerName: 'Employer Inc.',
        taxYear: 2025,
        boxes: { box14: 50000, box22: 7000 },
        extractionId: 'extraction-123',
        lowConfidenceFields: [],
        fileHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(body.rawModelResponses).toBeUndefined();
  });

  it('keeps OCR usable when storage upload fails before extraction', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'storage unavailable' } });

    const res = await POST(makeRequest({ slipType: 't4' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.extractionId).toBe('extraction-123');
    expect(mockExtractSlip).toHaveBeenCalledTimes(1);
  });

  it('surfaces blank extraction flags to clients without raw model responses', async () => {
    mockExtractSlip.mockResolvedValue({
      ...pipelineResult,
      status: 'validation_failed',
      validation: {
        valid: false,
        flags: [
          {
            field: 'boxes',
            reason: 'blank_extraction',
            message: 'No usable T4 boxes were extracted.',
          },
        ],
      },
      boxes: {},
      rawModelResponses: {
        classification: null,
        extraction: { secret: 'debug-only' },
      },
    } satisfies PipelineResult);

    const res = await POST(makeRequest({ slipType: 't4' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('validation_failed');
    expect(body.flags).toEqual([
      {
        field: 'boxes',
        reason: 'blank_extraction',
        message: 'No usable T4 boxes were extracted.',
      },
    ]);
    expect(body.rawModelResponses).toBeUndefined();
  });
});
