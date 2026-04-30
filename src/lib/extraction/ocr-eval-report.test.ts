import { describe, expect, it } from 'vitest';
import { buildOcrEvalReport, variantFromFixtureId } from './ocr-eval-report';
import type { OcrEvalFixture } from './ocr-eval';

describe('ocr-eval-report', () => {
  it('derives known synthetic variants from fixture ids', () => {
    expect(variantFromFixtureId('cra-synthetic-t4-clean')).toBe('clean');
    expect(variantFromFixtureId('cra-synthetic-t4-sparse')).toBe('sparse');
    expect(variantFromFixtureId('cra-synthetic-t4-dense')).toBe('dense');
    expect(variantFromFixtureId('cra-synthetic-t4-duplicate-copy')).toBe('duplicate-copy');
    expect(variantFromFixtureId('private-t4-real')).toBe('unknown');
  });

  it('summarizes OCR eval results by slip type and variant', () => {
    const fixtures: OcrEvalFixture[] = [
      {
        id: 'cra-synthetic-t4-clean',
        slipType: 't4',
        expected: {
          issuerName: 'Employer',
          taxYear: 2025,
          boxes: { box14: 100, box22: 10 },
        },
        actual: {
          issuerName: 'Employer',
          taxYear: 2025,
          boxes: { box14: 100, box22: 10 },
        },
      },
      {
        id: 'cra-synthetic-t4-sparse',
        slipType: 't4',
        expected: {
          issuerName: 'Employer',
          taxYear: 2025,
          boxes: { box14: 200 },
        },
        actual: {
          issuerName: 'Employer',
          taxYear: 2025,
          boxes: {},
        },
      },
      {
        id: 'cra-synthetic-t4a-dense',
        slipType: 't4a',
        expected: {
          issuerName: 'Payer',
          taxYear: 2025,
          boxes: { box105: 300 },
        },
        actual: {
          issuerName: 'Payer',
          taxYear: 2025,
          boxes: { box105: 300, box022: 12 },
        },
      },
    ];

    const report = buildOcrEvalReport(fixtures);

    expect(report.overall.totalFixtures).toBe(3);
    expect(report.overall.passedFixtures).toBe(1);
    expect(report.overall.failedFixtures).toBe(2);
    expect(report.overall.expectedFieldCount).toBe(4);
    expect(report.overall.matchedFieldCount).toBe(3);
    expect(report.overall.missingFieldCount).toBe(1);
    expect(report.overall.unexpectedFieldCount).toBe(1);

    expect(report.bySlipType.map((group) => [group.key, group.totalFixtures])).toEqual([
      ['t4', 2],
      ['t4a', 1],
    ]);
    expect(report.byVariant.map((group) => [group.key, group.totalFixtures])).toEqual([
      ['clean', 1],
      ['dense', 1],
      ['sparse', 1],
    ]);
    expect(report.bySlipTypeAndVariant.map((group) => group.key)).toEqual([
      't4:clean',
      't4:sparse',
      't4a:dense',
    ]);
    expect(report.failedResults.map((result) => result.fixtureId)).toEqual([
      'cra-synthetic-t4-sparse',
      'cra-synthetic-t4a-dense',
    ]);
  });
});
