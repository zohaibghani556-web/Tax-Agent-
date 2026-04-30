import { describe, expect, it } from 'vitest';
import {
  OCR_SYNTHETIC_FIXTURE_CASES,
  buildOcrSyntheticFixtureOutput,
  getOcrSyntheticFixtureCases,
  validateOcrSyntheticFixtureCase,
} from './ocr-synthetic-fixtures';
import type { OcrSyntheticFixtureCase } from './ocr-synthetic-fixtures';

describe('ocr-synthetic-fixtures', () => {
  it('defines clean synthetic cases for the first OCR quality priority slips', () => {
    expect(OCR_SYNTHETIC_FIXTURE_CASES.map((fixtureCase) => fixtureCase.slipType)).toEqual([
      't4',
      't4a',
      't2202',
    ]);

    for (const fixtureCase of OCR_SYNTHETIC_FIXTURE_CASES) {
      expect(() => validateOcrSyntheticFixtureCase(fixtureCase)).not.toThrow();
      expect(Object.keys(fixtureCase.expected.boxes).length).toBeGreaterThan(0);
    }
  });

  it('can filter cases by slip type', () => {
    expect(getOcrSyntheticFixtureCases(['t4a']).map((fixtureCase) => fixtureCase.id)).toEqual([
      'cra-synthetic-t4a-clean',
    ]);
  });

  it('builds a private source PDF and expected JSON payload', () => {
    const output = buildOcrSyntheticFixtureOutput(OCR_SYNTHETIC_FIXTURE_CASES[0]);

    expect(output.sourcePdf.subarray(0, 8).toString('utf8')).toBe('%PDF-1.4');
    expect(output.sourcePdf.toString('utf8')).toContain('Slip type: T4');
    expect(JSON.parse(output.expectedJson)).toEqual(OCR_SYNTHETIC_FIXTURE_CASES[0].expected);
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
