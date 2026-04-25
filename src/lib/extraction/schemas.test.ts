/**
 * TaxAgent.ai — Extraction Pipeline Schema & Validation Tests
 *
 * Tests the Zod schemas used by the structured output pipeline.
 * Verifies that valid extractions parse correctly and invalid ones
 * produce the right errors. Also tests the classification schema.
 */

import { describe, it, expect } from 'vitest';
import {
  ClassificationSchema,
  T4ExtractionSchema,
  T4AExtractionSchema,
  T5ExtractionSchema,
  T5008ExtractionSchema,
  T3ExtractionSchema,
  T2202ExtractionSchema,
  T4EExtractionSchema,
  T5007ExtractionSchema,
  T4APExtractionSchema,
  T4AOASExtractionSchema,
  T4RSPExtractionSchema,
  T4RIFExtractionSchema,
  RRSPReceiptExtractionSchema,
  T4FHSAExtractionSchema,
  EXTRACTION_SCHEMAS,
  isExtractable,
  SLIP_TYPE_LABELS,
  PIPELINE_TO_ENGINE_TYPE,
} from './schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validMetadata = {
  issuerName: { value: 'Acme Corp', confidence: 0.95 },
  taxYear: { value: 2025, confidence: 1.0 },
};

const field = (value: number, confidence = 0.95) => ({ value, confidence });
const strField = (value: string, confidence = 0.95) => ({ value, confidence });

// ---------------------------------------------------------------------------
// Classification Schema
// ---------------------------------------------------------------------------

describe('ClassificationSchema', () => {
  it('parses valid classification', () => {
    const result = ClassificationSchema.safeParse({
      slipType: 't4',
      confidence: 0.95,
      notes: 'Title reads Statement of Remuneration Paid',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slipType).toBe('t4');
    }
  });

  it('accepts all classifiable slip types', () => {
    const types = [
      't4', 't4a', 't5', 't3', 't2202', 't5008',
      't4e', 't5007', 't4ap', 't4aoas', 't4rsp', 't4rif',
      'rrsp_receipt', 't4fhsa',
      'rc62', 'rc210', 'prior_year_return',
      'unsupported', 'unclear',
    ];
    for (const slipType of types) {
      const result = ClassificationSchema.safeParse({
        slipType,
        confidence: 0.8,
        notes: 'test',
      });
      expect(result.success, `Expected ${slipType} to be valid`).toBe(true);
    }
  });

  it('rejects invalid slip type', () => {
    const result = ClassificationSchema.safeParse({
      slipType: 'w2',
      confidence: 0.9,
      notes: 'US form',
    });
    expect(result.success).toBe(false);
  });

  it('requires all fields', () => {
    expect(ClassificationSchema.safeParse({}).success).toBe(false);
    expect(ClassificationSchema.safeParse({ slipType: 't4' }).success).toBe(false);
    expect(ClassificationSchema.safeParse({ slipType: 't4', confidence: 0.9 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T4 Extraction Schema
// ---------------------------------------------------------------------------

describe('T4ExtractionSchema', () => {
  it('parses minimal valid T4 (metadata only)', () => {
    const result = T4ExtractionSchema.safeParse({ metadata: validMetadata });
    expect(result.success).toBe(true);
  });

  it('parses full T4 with all common boxes', () => {
    const result = T4ExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: field(72400),
      box16: field(3754.45),
      box16A: field(0),
      box18: field(1049.12),
      box20: field(2400),
      box22: field(14280),
      box44: field(960),
      box52: field(4800),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.box14?.value).toBe(72400);
      expect(result.data.box22?.value).toBe(14280);
    }
  });

  it('rejects field with missing confidence', () => {
    const result = T4ExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: { value: 72400 }, // missing confidence
    });
    expect(result.success).toBe(false);
  });

  it('rejects field with string value where number expected', () => {
    const result = T4ExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: { value: '72400', confidence: 0.9 },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T4A Extraction Schema
// ---------------------------------------------------------------------------

describe('T4AExtractionSchema', () => {
  it('parses T4A with scholarship box105', () => {
    const result = T4AExtractionSchema.safeParse({
      metadata: validMetadata,
      box016: field(24000),
      box022: field(3600),
      box105: field(5000),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.box105?.value).toBe(5000);
    }
  });
});

// ---------------------------------------------------------------------------
// T5 Extraction Schema
// ---------------------------------------------------------------------------

describe('T5ExtractionSchema', () => {
  it('parses T5 with interest and dividends', () => {
    const result = T5ExtractionSchema.safeParse({
      metadata: validMetadata,
      box13: field(420.50),
      box24: field(600),
      box25: field(828),
      box26: field(127.55),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T5008 Extraction Schema
// ---------------------------------------------------------------------------

describe('T5008ExtractionSchema', () => {
  it('parses T5008 with string fields for box15 and box16', () => {
    const result = T5008ExtractionSchema.safeParse({
      metadata: validMetadata,
      box15: strField('SHR'),
      box16: strField('AAPL - Apple Inc'),
      box20: field(6200),
      box21: field(8500),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.box15?.value).toBe('SHR');
      expect(result.data.box16?.value).toBe('AAPL - Apple Inc');
    }
  });
});

// ---------------------------------------------------------------------------
// T3 Extraction Schema
// ---------------------------------------------------------------------------

describe('T3ExtractionSchema', () => {
  it('parses T3 with capital gains and dividends', () => {
    const result = T3ExtractionSchema.safeParse({
      metadata: validMetadata,
      box21: field(1200),
      box49: field(380),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T2202 Extraction Schema
// ---------------------------------------------------------------------------

describe('T2202ExtractionSchema', () => {
  it('parses T2202 with tuition and months', () => {
    const result = T2202ExtractionSchema.safeParse({
      metadata: {
        issuerName: { value: 'University of Toronto', confidence: 1.0 },
        taxYear: { value: 2025, confidence: 1.0 },
      },
      boxA: field(6200),
      boxB: field(0),
      boxC: field(8),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.boxA?.value).toBe(6200);
      expect(result.data.boxC?.value).toBe(8);
    }
  });
});

// ---------------------------------------------------------------------------
// Simpler slip schemas
// ---------------------------------------------------------------------------

describe('T4EExtractionSchema', () => {
  it('parses T4E', () => {
    const result = T4EExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: field(8400),
      box22: field(840),
    });
    expect(result.success).toBe(true);
  });
});

describe('T5007ExtractionSchema', () => {
  it('parses T5007', () => {
    const result = T5007ExtractionSchema.safeParse({
      metadata: validMetadata,
      box10: field(12000),
    });
    expect(result.success).toBe(true);
  });
});

describe('T4APExtractionSchema', () => {
  it('parses T4AP', () => {
    const result = T4APExtractionSchema.safeParse({
      metadata: validMetadata,
      box16: field(8400),
      box22: field(840),
    });
    expect(result.success).toBe(true);
  });
});

describe('T4AOASExtractionSchema', () => {
  it('parses T4AOAS', () => {
    const result = T4AOASExtractionSchema.safeParse({
      metadata: validMetadata,
      box18: field(7200),
      box21: field(0),
      box22: field(0),
    });
    expect(result.success).toBe(true);
  });
});

describe('T4RSPExtractionSchema', () => {
  it('parses T4RSP', () => {
    const result = T4RSPExtractionSchema.safeParse({
      metadata: validMetadata,
      box22: field(10000),
      box30: field(2000),
    });
    expect(result.success).toBe(true);
  });
});

describe('T4RIFExtractionSchema', () => {
  it('parses T4RIF', () => {
    const result = T4RIFExtractionSchema.safeParse({
      metadata: validMetadata,
      box16: field(15000),
      box30: field(1500),
    });
    expect(result.success).toBe(true);
  });
});

describe('RRSPReceiptExtractionSchema', () => {
  it('parses RRSP receipt with contribution details', () => {
    const result = RRSPReceiptExtractionSchema.safeParse({
      metadata: validMetadata,
      amount: field(5000),
      planType: strField('RRSP'),
      dateOfContribution: strField('2025-01-15'),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.planType?.value).toBe('RRSP');
    }
  });
});

describe('T4FHSAExtractionSchema', () => {
  it('parses T4FHSA', () => {
    const result = T4FHSAExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: field(0),
      box22: field(0),
      box24: field(8000),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Registry & helpers
// ---------------------------------------------------------------------------

describe('EXTRACTION_SCHEMAS registry', () => {
  it('has schemas for all 14 extractable slip types', () => {
    expect(Object.keys(EXTRACTION_SCHEMAS)).toHaveLength(14);
  });

  it('every schema has metadata as a required field', () => {
    for (const [type, schema] of Object.entries(EXTRACTION_SCHEMAS)) {
      const result = schema.safeParse({});
      expect(result.success, `${type} should require metadata`).toBe(false);

      const withMeta = schema.safeParse({ metadata: validMetadata });
      expect(withMeta.success, `${type} should accept valid metadata`).toBe(true);
    }
  });
});

describe('isExtractable', () => {
  it('returns true for extractable types', () => {
    expect(isExtractable('t4')).toBe(true);
    expect(isExtractable('t4a')).toBe(true);
    expect(isExtractable('rrsp_receipt')).toBe(true);
  });

  it('returns false for non-extractable types', () => {
    expect(isExtractable('rc62')).toBe(false);
    expect(isExtractable('unsupported')).toBe(false);
    expect(isExtractable('unclear')).toBe(false);
    expect(isExtractable('w2')).toBe(false);
  });
});

describe('SLIP_TYPE_LABELS', () => {
  it('has labels for all extractable types', () => {
    for (const key of Object.keys(EXTRACTION_SCHEMAS)) {
      expect(SLIP_TYPE_LABELS[key as keyof typeof SLIP_TYPE_LABELS]).toBeDefined();
    }
  });
});

describe('PIPELINE_TO_ENGINE_TYPE', () => {
  it('maps all extractable types to engine types', () => {
    for (const key of Object.keys(EXTRACTION_SCHEMAS)) {
      expect(PIPELINE_TO_ENGINE_TYPE[key as keyof typeof PIPELINE_TO_ENGINE_TYPE]).toBeDefined();
    }
  });

  it('maps to correct engine format', () => {
    expect(PIPELINE_TO_ENGINE_TYPE.t4).toBe('T4');
    expect(PIPELINE_TO_ENGINE_TYPE.t4a).toBe('T4A');
    expect(PIPELINE_TO_ENGINE_TYPE.rrsp_receipt).toBe('RRSP-Receipt');
    expect(PIPELINE_TO_ENGINE_TYPE.t4aoas).toBe('T4AOAS');
  });
});

// ---------------------------------------------------------------------------
// Validation logic (pure Zod — no API calls)
// ---------------------------------------------------------------------------

describe('Confidence tracking', () => {
  it('preserves per-field confidence values', () => {
    const result = T4ExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: { value: 72400, confidence: 0.95 },
      box22: { value: 14280, confidence: 0.60 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.box14?.confidence).toBe(0.95);
      expect(result.data.box22?.confidence).toBe(0.60);
    }
  });

  it('accepts zero confidence', () => {
    const result = T4ExtractionSchema.safeParse({
      metadata: validMetadata,
      box14: { value: 0, confidence: 0 },
    });
    expect(result.success).toBe(true);
  });
});
