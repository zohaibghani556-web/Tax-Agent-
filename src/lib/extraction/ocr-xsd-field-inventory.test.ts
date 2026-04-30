import { describe, expect, it } from 'vitest';
import { buildOcrXsdFieldInventoryReport } from './ocr-xsd-field-inventory';

describe('ocr-xsd-field-inventory', () => {
  it('reports generated XSD box-map coverage without requiring every slip to be generated yet', () => {
    const report = buildOcrXsdFieldInventoryReport();

    expect(report.totalSlipCount).toBe(14);
    expect(report.generatedCoverageCount).toBe(6);

    const generated = report.entries
      .filter((entry) => entry.hasGeneratedXsdBoxMap)
      .map((entry) => entry.engineType)
      .sort();
    expect(generated).toEqual(['T2202', 'T3', 'T4', 'T4A', 'T5', 'T5008']);
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
  });
});
