import { describe, expect, it } from 'vitest';
import fixturesJson from './fixtures/ocr-eval/synthetic-supported-slips.json';
import {
  evaluateOcrFixture,
  evaluateOcrFixtures,
  summarizeOcrEvalResults,
} from './ocr-eval';
import type { OcrEvalFixture } from './ocr-eval';

const fixtures = fixturesJson as unknown as OcrEvalFixture[];

describe('ocr-eval', () => {
  it('passes the synthetic all-slip fixture suite', () => {
    const results = evaluateOcrFixtures(fixtures);
    const summary = summarizeOcrEvalResults(results);

    expect(fixtures).toHaveLength(14);
    expect(summary).toEqual({
      totalFixtures: 14,
      passedFixtures: 14,
      failedFixtures: 0,
      averageFieldAccuracy: 1,
    });
  });

  it('fails when an expected box is missing', () => {
    const result = evaluateOcrFixture({
      id: 'missing-box',
      slipType: 't4',
      expected: {
        boxes: { box14: 50000, box22: 7000 },
      },
      actual: {
        boxes: { box14: 50000 },
      },
    });

    expect(result.status).toBe('fail');
    expect(result.fieldAccuracy).toBe(0.5);
    expect(result.missingFields).toEqual([
      {
        field: 'box22',
        expected: 7000,
        actual: null,
        reason: 'missing',
      },
    ]);
  });

  it('fails when a numeric box differs outside tolerance', () => {
    const result = evaluateOcrFixture({
      id: 'wrong-value',
      slipType: 't4a',
      expected: {
        boxes: { box105: 2030 },
      },
      actual: {
        boxes: { box105: 2300 },
      },
    });

    expect(result.status).toBe('fail');
    expect(result.mismatchedFields).toEqual([
      {
        field: 'box105',
        expected: 2030,
        actual: 2300,
        reason: 'value_mismatch',
      },
    ]);
  });

  it('allows cent-level numeric tolerance by default', () => {
    const result = evaluateOcrFixture({
      id: 'cent-tolerance',
      slipType: 't5',
      expected: {
        boxes: { box13: 420.5 },
      },
      actual: {
        boxes: { box13: 420.505 },
      },
    });

    expect(result.status).toBe('pass');
  });

  it('fails on unexpected boxes unless the fixture allows them', () => {
    const strict = evaluateOcrFixture({
      id: 'unexpected-box',
      slipType: 't4',
      expected: {
        boxes: { box14: 50000 },
      },
      actual: {
        boxes: { box14: 50000, box22: 7000 },
      },
    });

    const permissive = evaluateOcrFixture({
      id: 'unexpected-box-allowed',
      slipType: 't4',
      expected: {
        boxes: { box14: 50000 },
      },
      actual: {
        boxes: { box14: 50000, box22: 7000 },
      },
      options: {
        allowUnexpectedBoxes: true,
      },
    });

    expect(strict.status).toBe('fail');
    expect(strict.unexpectedFields.map((field) => field.field)).toEqual(['box22']);
    expect(permissive.status).toBe('pass');
  });

  it('fails on blank extraction flags even if boxes happen to be empty', () => {
    const result = evaluateOcrFixture({
      id: 'blank-extraction',
      slipType: 't2202',
      expected: {
        boxes: { boxA: 6200 },
      },
      actual: {
        boxes: {},
        flags: [
          {
            field: 'boxes',
            reason: 'blank_extraction',
            message: 'No usable boxes extracted.',
          },
        ],
      },
    });

    expect(result.status).toBe('fail');
    expect(result.blockingFlags.map((flag) => flag.reason)).toEqual(['blank_extraction']);
  });

  it('fails when a fixture references a box outside the supported slip contract', () => {
    const result = evaluateOcrFixture({
      id: 'unknown-field',
      slipType: 't4',
      expected: {
        boxes: { box999: 1 },
      },
      actual: {
        boxes: { box999: 1 },
      },
    });

    expect(result.status).toBe('fail');
    expect(result.invalidExpectedFields).toEqual(['box999']);
    expect(result.invalidActualFields).toEqual(['box999']);
  });
});
