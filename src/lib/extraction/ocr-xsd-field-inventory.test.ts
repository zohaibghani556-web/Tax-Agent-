import { describe, expect, it } from 'vitest';
import { buildOcrXsdFieldInventoryReport } from './ocr-xsd-field-inventory';

describe('ocr-xsd-field-inventory', () => {
  it('reports generated XSD box-map coverage without requiring every slip to be generated yet', () => {
    const report = buildOcrXsdFieldInventoryReport();

    expect(report.totalSlipCount).toBe(14);
    expect(report.generatedCoverageCount).toBe(6);
    expect(report.mappedCoverageCount).toBe(14);

    const generated = report.entries
      .filter((entry) => entry.hasGeneratedXsdBoxMap)
      .map((entry) => entry.engineType)
      .sort();
    expect(generated).toEqual(['T2202', 'T3', 'T4', 'T4A', 'T5', 'T5008']);
  });

  it('adds report-only supplemental XSD mappings for supported slips outside generated maps', () => {
    const report = buildOcrXsdFieldInventoryReport();
    const supplemental = report.entries
      .filter((entry) => entry.hasSupplementalXsdBoxMap)
      .map((entry) => entry.engineType)
      .sort();

    expect(supplemental).toEqual([
      'RRSP-Receipt',
      'T4AOAS',
      'T4AP',
      'T4E',
      'T4FHSA',
      'T4RIF',
      'T4RSP',
      'T5007',
    ]);
  });

  it('finds app-supported fields that have generated XSD mappings for priority slips', () => {
    const report = buildOcrXsdFieldInventoryReport();
    const t4 = report.entries.find((entry) => entry.engineType === 'T4');
    const t4a = report.entries.find((entry) => entry.engineType === 'T4A');
    const t2202 = report.entries.find((entry) => entry.engineType === 'T2202');

    expect(t4?.appBoxKeysWithXsdMapping).toEqual(
      expect.arrayContaining(['box14', 'box16', 'box18', 'box22', 'box24', 'box26', 'box45']),
    );
    expect(t4a?.appBoxKeysWithXsdMapping).toEqual(
      expect.arrayContaining(['box016', 'box018', 'box020', 'box022', 'box024', 'box048', 'box105']),
    );
    expect(t2202?.appBoxKeysWithXsdMapping).toEqual(['boxA', 'boxB', 'boxC']);
  });

  it('finds app-supported fields with supplemental XSD mappings for remaining supported slips', () => {
    const report = buildOcrXsdFieldInventoryReport();

    expect(report.entries.find((entry) => entry.engineType === 'T4E')?.appBoxKeysWithXsdMapping).toEqual(['box14', 'box22']);
    expect(report.entries.find((entry) => entry.engineType === 'T5007')?.appBoxKeysWithXsdMapping).toEqual(['box10']);
    expect(report.entries.find((entry) => entry.engineType === 'T4AP')?.appBoxKeysWithXsdMapping).toEqual(['box16', 'box20', 'box22']);
    expect(report.entries.find((entry) => entry.engineType === 'T4AOAS')?.appBoxKeysWithXsdMapping).toEqual(['box18', 'box21', 'box22']);
    expect(report.entries.find((entry) => entry.engineType === 'T4RSP')?.appBoxKeysWithXsdMapping).toEqual(['box20', 'box22']);
    expect(report.entries.find((entry) => entry.engineType === 'T4RIF')?.appBoxKeysWithXsdMapping).toEqual(['box16', 'box30']);
    expect(report.entries.find((entry) => entry.engineType === 'T4FHSA')?.appBoxKeysWithXsdMapping).toEqual(['box14', 'box22', 'box24']);
  });

  it('keeps known app-vs-XSD gaps visible for review instead of silently passing them', () => {
    const report = buildOcrXsdFieldInventoryReport();
    const t4 = report.entries.find((entry) => entry.engineType === 'T4');
    const t4a = report.entries.find((entry) => entry.engineType === 'T4A');

    expect(t4?.appBoxKeysMissingXsdMapping).toEqual(
      expect.arrayContaining(['box40', 'box42', 'box85']),
    );
    expect(t4?.xsdMappedBoxKeysUnsupportedByApp).toEqual(
      expect.arrayContaining(['code40', 'code42', 'code85']),
    );
    expect(t4a?.appBoxKeysMissingXsdMapping).toEqual(['box135']);

    const rrspReceipt = report.entries.find((entry) => entry.engineType === 'RRSP-Receipt');
    expect(rrspReceipt?.appBoxKeysMissingXsdMapping).toEqual(['dateOfContribution']);
  });
});
