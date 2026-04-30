#!/usr/bin/env tsx

import { buildOcrXsdFieldInventoryReport } from '../src/lib/extraction/ocr-xsd-field-inventory';
import type { OcrXsdFieldInventoryEntry } from '../src/lib/extraction/ocr-xsd-field-inventory';

function formatList(values: string[]): string {
  if (values.length === 0) return '-';
  return values.join(', ');
}

function formatEntry(entry: OcrXsdFieldInventoryEntry): string[] {
  return [
    `${entry.engineType} (${entry.slipType})`,
    `  generated XSD map: ${entry.hasGeneratedXsdBoxMap ? 'yes' : 'no'}`,
    `  XSD files: ${entry.xsdFiles.join(', ')}`,
    `  XSD mapped fields: ${entry.xsdFieldCount}`,
    `  app supported boxes: ${entry.appSupportedBoxKeys.length}`,
    `  app boxes with XSD mapping: ${formatList(entry.appBoxKeysWithXsdMapping)}`,
    `  app boxes missing XSD mapping: ${formatList(entry.appBoxKeysMissingXsdMapping)}`,
    `  XSD mapped boxes unsupported by app: ${formatList(entry.xsdMappedBoxKeysUnsupportedByApp)}`,
  ];
}

const report = buildOcrXsdFieldInventoryReport();

console.log('OCR XSD field inventory report');
console.log(`Generated XSD box-map coverage: ${report.generatedCoverageCount}/${report.totalSlipCount} supported slips`);
console.log('');

for (const entry of report.entries) {
  console.log(formatEntry(entry).join('\n'));
  console.log('');
}
