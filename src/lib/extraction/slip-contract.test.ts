import { describe, expect, it } from 'vitest';
import {
  EXTRACTION_SCHEMAS,
  PIPELINE_TO_ENGINE_TYPE,
} from './schemas';
import {
  buildLegacyJsonFallbackPrompt,
  normalizeLegacyBoxKey,
  normalizeLegacyJsonExtraction,
  validateExtraction,
} from './pipeline';
import { SLIP_FIELDS } from '@/lib/slips/slip-fields';
import { buildReviewFieldValues, getIssuerFieldKey } from '@/lib/slips/review-values';
import type { ExtractableSlipType, ExtractionResult } from './types';
import type { SlipFieldDef } from '@/lib/slips/slip-fields';

type SchemaWithShape = {
  shape: Record<string, unknown>;
};

const extractableTypes = Object.keys(EXTRACTION_SCHEMAS) as ExtractableSlipType[];

const metadata = {
  issuerName: { value: 'Issuer Inc.', confidence: 0.99 },
  taxYear: { value: 2025, confidence: 0.99 },
};

function schemaKeys(slipType: ExtractableSlipType): string[] {
  const shape = (EXTRACTION_SCHEMAS[slipType] as unknown as SchemaWithShape).shape;
  return Object.keys(shape).filter((key) => key !== 'metadata').sort();
}

function configuredBoxFields(slipType: ExtractableSlipType): SlipFieldDef[] {
  const engineSlipType = PIPELINE_TO_ENGINE_TYPE[slipType];
  const issuerKey = getIssuerFieldKey(engineSlipType);
  return (SLIP_FIELDS[engineSlipType] ?? []).filter((field) => field.key !== issuerKey);
}

function sampleValue(field: SlipFieldDef, index: number): number | string {
  if (field.valueType === 'text') return `${field.key}-value`;
  return index + 100.25;
}

function extraction(fields: ExtractionResult['fields']): ExtractionResult {
  return {
    metadata,
    fields,
  };
}

describe('OCR slip-reading contract', () => {
  it('keeps every extraction schema aligned with reviewable slip fields', () => {
    for (const slipType of extractableTypes) {
      const expected = configuredBoxFields(slipType).map((field) => field.key).sort();

      expect(schemaKeys(slipType), `${slipType} schema keys must match SLIP_FIELDS`).toEqual(expected);
    }
  });

  it('accepts every configured review field with the configured value type', () => {
    for (const slipType of extractableTypes) {
      const payload = Object.fromEntries(
        configuredBoxFields(slipType).map((field, index) => [
          field.key,
          { value: sampleValue(field, index), confidence: 0.99 },
        ]),
      );

      const parsed = EXTRACTION_SCHEMAS[slipType].safeParse({
        metadata,
        ...payload,
      });

      expect(parsed.success, `${slipType} should parse all configured fields`).toBe(true);
      if (parsed.success) {
        const parsedData = parsed.data as Record<string, unknown>;
        for (const field of configuredBoxFields(slipType)) {
          expect(parsedData[field.key], `${slipType}.${field.key} should survive Zod parsing`).toBeDefined();
        }
      }
    }
  });

  it('builds legacy JSON prompts from the same field list for every supported slip', () => {
    for (const slipType of extractableTypes) {
      const prompt = buildLegacyJsonFallbackPrompt(slipType);

      expect(prompt).toContain('Return ONLY valid JSON');
      expect(prompt).toContain(PIPELINE_TO_ENGINE_TYPE[slipType]);
      for (const field of configuredBoxFields(slipType)) {
        expect(prompt, `${slipType} prompt should include ${field.key}`).toContain(field.key);
      }
    }
  });

  it('normalizes canonical and printed box-number keys for every supported slip', () => {
    for (const slipType of extractableTypes) {
      for (const field of configuredBoxFields(slipType)) {
        expect(normalizeLegacyBoxKey(field.key, slipType)).toBe(field.key);

        if (field.key.startsWith('box')) {
          const printedBox = field.key.slice(3);
          expect(normalizeLegacyBoxKey(`Box ${printedBox}`, slipType)).toBe(field.key);

          const withoutLeadingZeros = printedBox.replace(/^0+/, '') || printedBox;
          expect(normalizeLegacyBoxKey(withoutLeadingZeros, slipType)).toBe(field.key);
        }
      }
    }
  });

  it('normalizes legacy JSON boxes into reviewable extraction fields for every supported slip', () => {
    for (const slipType of extractableTypes) {
      const boxes = Object.fromEntries(
        configuredBoxFields(slipType).map((field, index) => {
          const rawKey = field.key.startsWith('box') ? `Box ${field.key.slice(3)}` : field.key;
          return [rawKey, sampleValue(field, index)];
        }),
      );

      const result = normalizeLegacyJsonExtraction(
        {
          issuerName: 'Issuer Inc.',
          taxYear: 2025,
          confidence: 0.99,
          boxes,
        },
        slipType,
      );

      for (const [index, field] of configuredBoxFields(slipType).entries()) {
        expect(result.fields[field.key]?.value, `${slipType}.${field.key}`).toBe(sampleValue(field, index));
      }
    }
  });

  it('marks blank OCR invalid for every supported slip type', () => {
    for (const slipType of extractableTypes) {
      const result = validateExtraction(extraction({}), slipType);

      expect(result.valid, `${slipType} blank extraction should be invalid`).toBe(false);
      expect(result.flags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'boxes',
            reason: 'blank_extraction',
          }),
        ]),
      );
    }
  });

  it('validates a minimal nonblank extraction for every supported slip type', () => {
    for (const slipType of extractableTypes) {
      const fieldsToPopulate = configuredBoxFields(slipType).filter((field) => field.required);
      const fields = fieldsToPopulate.length > 0
        ? fieldsToPopulate
        : configuredBoxFields(slipType).slice(0, 1);

      const extractedFields = Object.fromEntries(
        fields.map((field, index) => [
          field.key,
          { value: sampleValue(field, index), confidence: 0.99 },
        ]),
      );
      const result = validateExtraction(extraction(extractedFields), slipType);

      expect(
        result.flags.filter((flag) => flag.reason === 'blank_extraction' || flag.reason === 'zod_error'),
        `${slipType} should have no blocking OCR contract flags`,
      ).toEqual([]);
    }
  });

  it('preserves every extracted box through review value construction', () => {
    for (const slipType of extractableTypes) {
      const engineSlipType = PIPELINE_TO_ENGINE_TYPE[slipType];
      const boxes = Object.fromEntries(
        configuredBoxFields(slipType).map((field, index) => [field.key, sampleValue(field, index)]),
      );

      const reviewValues = buildReviewFieldValues(engineSlipType, boxes, 'Issuer Inc.');

      for (const [index, field] of configuredBoxFields(slipType).entries()) {
        expect(reviewValues[field.key], `${engineSlipType}.${field.key}`).toBe(sampleValue(field, index));
      }
      expect(reviewValues[getIssuerFieldKey(engineSlipType)]).toBe('Issuer Inc.');
    }
  });
});
