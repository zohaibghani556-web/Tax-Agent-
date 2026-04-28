import { describe, expect, it } from 'vitest';
import { validateExtraction } from './pipeline';
import type { ExtractionResult } from './types';

function extraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    metadata: {
      issuerName: { value: 'Employer Inc.', confidence: 0.99 },
      taxYear: { value: 2025, confidence: 0.99 },
    },
    fields: {},
    ...overrides,
  };
}

describe('validateExtraction', () => {
  it('flags omitted required OCR fields as missing_required', () => {
    const result = validateExtraction(extraction(), 't4');

    expect(result.valid).toBe(true);
    expect(result.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'box14',
          reason: 'missing_required',
        }),
      ]),
    );
  });

  it('does not flag explicit numeric zero as missing', () => {
    const result = validateExtraction(
      extraction({
        fields: {
          box14: { value: 0, confidence: 0.99 },
        },
      }),
      't4',
    );

    expect(result.flags.some((flag) => flag.field === 'box14')).toBe(false);
  });

  it('maps missing T2202 issuer metadata to institutionName', () => {
    const result = validateExtraction(
      extraction({
        metadata: {
          issuerName: { value: '', confidence: 0.99 },
          taxYear: { value: 2025, confidence: 0.99 },
        },
        fields: {
          boxA: { value: 14625.25, confidence: 0.99 },
        },
      }),
      't2202',
    );

    expect(result.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'institutionName',
          reason: 'missing_required',
        }),
      ]),
    );
  });
});
