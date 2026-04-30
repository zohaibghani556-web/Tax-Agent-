import { describe, expect, it } from 'vitest';
import {
  OCR_SYNTHETIC_FIXTURE_CASES,
  buildOcrSyntheticFixtureOutput,
  getOcrSyntheticFixtureCases,
  validateOcrSyntheticFixtureCase,
} from './ocr-synthetic-fixtures';
import type { OcrSyntheticFixtureCase } from './ocr-synthetic-fixtures';

describe('ocr-synthetic-fixtures', () => {
  it('defines synthetic variants for the first OCR quality priority slips', () => {
    expect(new Set(OCR_SYNTHETIC_FIXTURE_CASES.map((fixtureCase) => fixtureCase.slipType))).toEqual(
      new Set(['t4', 't4a', 't2202']),
    );
    expect(OCR_SYNTHETIC_FIXTURE_CASES.length).toBeGreaterThan(3);

    for (const fixtureCase of OCR_SYNTHETIC_FIXTURE_CASES) {
      expect(() => validateOcrSyntheticFixtureCase(fixtureCase)).not.toThrow();
      expect(Object.keys(fixtureCase.expected.boxes).length).toBeGreaterThan(0);
    }
  });

  it('covers sparse, dense, and duplicate-copy conditions where applicable', () => {
    const variantsBySlip = new Map<string, Set<string>>();
    for (const fixtureCase of OCR_SYNTHETIC_FIXTURE_CASES) {
      const variants = variantsBySlip.get(fixtureCase.slipType) ?? new Set<string>();
      variants.add(fixtureCase.variant);
      variantsBySlip.set(fixtureCase.slipType, variants);
    }

    expect(variantsBySlip.get('t4')).toEqual(
      new Set(['clean-pdf', 'sparse-pdf', 'dense-pdf', 'duplicate-copy-pdf']),
    );
    expect(variantsBySlip.get('t4a')).toEqual(
      new Set(['clean-pdf', 'sparse-pdf', 'dense-pdf', 'duplicate-copy-pdf']),
    );
    expect(variantsBySlip.get('t2202')).toEqual(
      new Set(['clean-pdf', 'sparse-pdf', 'duplicate-copy-pdf']),
    );
  });

  it('can filter cases by slip type', () => {
    expect(getOcrSyntheticFixtureCases(['t4a']).every((fixtureCase) => fixtureCase.slipType === 't4a')).toBe(true);
    expect(getOcrSyntheticFixtureCases(['t4a']).map((fixtureCase) => fixtureCase.id)).toContain(
      'cra-synthetic-t4a-clean',
    );
  });

  it('builds a private source PDF and expected JSON payload', () => {
    const output = buildOcrSyntheticFixtureOutput(OCR_SYNTHETIC_FIXTURE_CASES[0]);

    expect(output.sourcePdf.subarray(0, 8).toString('utf8')).toBe('%PDF-1.4');
    expect(output.sourcePdf.toString('utf8')).toContain('Slip type: T4');
    expect(JSON.parse(output.expectedJson)).toEqual(OCR_SYNTHETIC_FIXTURE_CASES[0].expected);
  });

  it('prints the repeated slip copy for duplicate-copy variants', () => {
    const duplicateFixture = OCR_SYNTHETIC_FIXTURE_CASES.find(
      (fixtureCase) => fixtureCase.variant === 'duplicate-copy-pdf',
    );
    expect(duplicateFixture).toBeDefined();

    const output = buildOcrSyntheticFixtureOutput(duplicateFixture!);
    expect(output.sourcePdf.toString('utf8')).toContain('Second copy of the same slip');
  });

  it('rejects expected boxes that are not supported by the app field map', () => {
    const invalidCase: OcrSyntheticFixtureCase = {
      ...OCR_SYNTHETIC_FIXTURE_CASES[0],
      expected: {
        ...OCR_SYNTHETIC_FIXTURE_CASES[0].expected,
        boxes: {
          ...OCR_SYNTHETIC_FIXTURE_CASES[0].expected.boxes,
          box999: 1,
        },
      },
    };

    expect(() => validateOcrSyntheticFixtureCase(invalidCase)).toThrow(
      'references unsupported t4 field: box999',
    );
  });
});
