import { describe, expect, it } from 'vitest';
import {
  buildFocusedExtractionPrompt,
  buildExtractionPrompt,
  buildLegacyJsonFallbackPrompt,
  isRetryableExtractionError,
  mergeExtractionResults,
  normalizeLegacyBoxKey,
  normalizeLegacyJsonExtraction,
  shouldRunFocusedExtractionRetry,
  shouldRunLegacyJsonFallback,
  shouldUseLegacyJsonPrimary,
  validateExtraction,
} from './pipeline';
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

    expect(result.valid).toBe(false);
    expect(result.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'boxes',
          reason: 'blank_extraction',
        }),
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

  it('marks blank T4A extraction invalid even though T4A boxes are optional', () => {
    const result = validateExtraction(extraction(), 't4a');

    expect(result.valid).toBe(false);
    expect(result.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'boxes',
          reason: 'blank_extraction',
        }),
      ]),
    );
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

describe('buildExtractionPrompt', () => {
  it('adds explicit T4 numbered-box guidance', () => {
    const prompt = buildExtractionPrompt('t4');

    expect(prompt).toContain('T4 CRITICAL FIELD MAPPING');
    expect(prompt).toContain('box14: Box 14, employment income');
    expect(prompt).toContain('box22: Box 22, income tax deducted');
    expect(prompt).toContain('Use the box number beside each amount');
    expect(prompt).toContain('Use 0 only when the slip explicitly prints 0 or 0.00');
  });
});

describe('buildFocusedExtractionPrompt', () => {
  it('adds T4 retry instructions that force value-or-null review', () => {
    const prompt = buildFocusedExtractionPrompt('t4');

    expect(prompt).toContain('FOCUSED T4 RETRY');
    expect(prompt).toContain('previous extraction pass did not extract Box 14');
    expect(prompt).toContain('Use null only when that exact numbered box is blank');
    expect(prompt).toContain('Do not calculate, infer, or copy values');
  });
});

describe('shouldRunFocusedExtractionRetry', () => {
  it('retries T4 extraction when box14 is blank', () => {
    expect(shouldRunFocusedExtractionRetry('t4', extraction())).toBe(true);
  });

  it('does not retry T4 extraction when box14 is explicit zero', () => {
    expect(
      shouldRunFocusedExtractionRetry(
        't4',
        extraction({ fields: { box14: { value: 0, confidence: 0.99 } } }),
      ),
    ).toBe(false);
  });

  it('does not retry non-T4 extraction', () => {
    expect(shouldRunFocusedExtractionRetry('t2202', extraction())).toBe(false);
  });
});

describe('buildLegacyJsonFallbackPrompt', () => {
  it('builds explicit JSON extraction instructions for T4 fields', () => {
    const prompt = buildLegacyJsonFallbackPrompt('t4');

    expect(prompt).toContain('Return ONLY valid JSON');
    expect(prompt).toContain('box14');
    expect(prompt).toContain('box22');
    expect(prompt).toContain('lowConfidenceFields');
    expect(prompt).not.toContain('output schema');
  });

  it('builds explicit JSON extraction instructions for T4A fields', () => {
    const prompt = buildLegacyJsonFallbackPrompt('t4a');

    expect(prompt).toContain('T4A');
    expect(prompt).toContain('Return ONLY valid JSON');
    expect(prompt).toContain('box016');
    expect(prompt).toContain('box105');
    expect(prompt).toContain('lowConfidenceFields');
  });
});

describe('shouldUseLegacyJsonPrimary', () => {
  it('uses the legacy JSON path first for visually fragile slip types', () => {
    expect(shouldUseLegacyJsonPrimary('t4')).toBe(true);
    expect(shouldUseLegacyJsonPrimary('t4a')).toBe(true);
    expect(shouldUseLegacyJsonPrimary('t2202')).toBe(false);
  });
});

describe('shouldRunLegacyJsonFallback', () => {
  it('falls back for blank T4A extractions', () => {
    expect(shouldRunLegacyJsonFallback('t4a', extraction())).toBe(true);
  });

  it('does not require T4A box016 when another configured box was extracted', () => {
    expect(
      shouldRunLegacyJsonFallback(
        't4a',
        extraction({ fields: { box105: { value: 500, confidence: 0.9 } } }),
      ),
    ).toBe(false);
  });
});

describe('normalizeLegacyJsonExtraction', () => {
  it('normalizes common T4 box key aliases', () => {
    expect(normalizeLegacyBoxKey('14', 't4')).toBe('box14');
    expect(normalizeLegacyBoxKey('Box 22', 't4')).toBe('box22');
    expect(normalizeLegacyBoxKey('incomeTaxDeducted', 't4')).toBe('box22');
    expect(normalizeLegacyBoxKey('CPP2 contributions', 't4')).toBe('box16A');
    expect(normalizeLegacyBoxKey('not a T4 box', 't4')).toBeNull();
  });

  it('normalizes common T4A box key aliases and zero-padded box numbers', () => {
    expect(normalizeLegacyBoxKey('Box 016', 't4a')).toBe('box016');
    expect(normalizeLegacyBoxKey('16', 't4a')).toBe('box016');
    expect(normalizeLegacyBoxKey('taxWithheld', 't4a')).toBe('box022');
    expect(normalizeLegacyBoxKey('scholarship', 't4a')).toBe('box105');
    expect(normalizeLegacyBoxKey('not a T4A box', 't4a')).toBeNull();
  });

  it('normalizes legacy T4 JSON boxes into extraction fields', () => {
    const result = normalizeLegacyJsonExtraction(
      {
        issuerName: 'Employer Inc.',
        taxYear: 2025,
        confidence: 0.82,
        lowConfidenceFields: ['box22'],
        boxes: {
          '14': '$72,400.00',
          incomeTaxDeducted: 14280,
          'Box 45': '1',
          unsupported: 123,
        },
      },
      't4',
    );

    expect(result.metadata.issuerName.value).toBe('Employer Inc.');
    expect(result.metadata.taxYear.value).toBe(2025);
    expect(result.fields.box14?.value).toBe(72400);
    expect(result.fields.box14?.confidence).toBe(0.82);
    expect(result.fields.box22?.value).toBe(14280);
    expect(result.fields.box22?.confidence).toBe(0.6);
    expect(result.fields.box45?.value).toBe('1');
    expect(result.fields.unsupported).toBeUndefined();
  });

  it('normalizes legacy T4A JSON boxes into extraction fields', () => {
    const result = normalizeLegacyJsonExtraction(
      {
        issuerName: 'Payer Inc.',
        taxYear: 2025,
        confidence: 0.82,
        lowConfidenceFields: ['taxWithheld'],
        boxes: {
          '16': '$10,000.00',
          taxWithheld: 1200,
          scholarship: 500,
          unsupported: 123,
        },
      },
      't4a',
    );

    expect(result.metadata.issuerName.value).toBe('Payer Inc.');
    expect(result.metadata.taxYear.value).toBe(2025);
    expect(result.fields.box016?.value).toBe(10000);
    expect(result.fields.box016?.confidence).toBe(0.82);
    expect(result.fields.box022?.value).toBe(1200);
    expect(result.fields.box022?.confidence).toBe(0.6);
    expect(result.fields.box105?.value).toBe(500);
    expect(result.fields.unsupported).toBeUndefined();
  });

  it('drops blank and unparsable legacy numeric boxes', () => {
    const result = normalizeLegacyJsonExtraction(
      {
        boxes: {
          box14: '',
          box22: 'not readable',
        },
      },
      't4',
    );

    expect(result.fields.box14).toBeUndefined();
    expect(result.fields.box22).toBeUndefined();
  });
});

describe('mergeExtractionResults', () => {
  it('fills missing fields from retry while preserving primary values', () => {
    const merged = mergeExtractionResults(
      extraction({
        fields: {
          box22: { value: 1000, confidence: 0.8 },
        },
      }),
      extraction({
        fields: {
          box14: { value: 50000, confidence: 0.7 },
          box22: { value: 9999, confidence: 0.99 },
        },
      }),
    );

    expect(merged.fields.box14?.value).toBe(50000);
    expect(merged.fields.box22?.value).toBe(1000);
  });
});

describe('isRetryableExtractionError', () => {
  it('does not retry request timeouts', () => {
    expect(isRetryableExtractionError(new Error('Request timed out.'))).toBe(false);
  });

  it('retries transient API capacity errors', () => {
    expect(isRetryableExtractionError(new Error('529 overloaded'))).toBe(true);
    expect(isRetryableExtractionError(new Error('503 Service Unavailable'))).toBe(true);
  });
});
