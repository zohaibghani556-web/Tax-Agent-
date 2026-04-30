import { SLIP_FIELDS } from '@/lib/slips/slip-fields';
import { PIPELINE_TO_ENGINE_TYPE } from './schemas';
import type { ExtractableSlipType } from './types';
import type { OcrEvalExpected, OcrEvalValue } from './ocr-eval';

export type OcrSyntheticVariant = 'clean-pdf';

export interface OcrSyntheticFixtureCase {
  id: string;
  slipType: ExtractableSlipType;
  variant: OcrSyntheticVariant;
  description: string;
  expected: OcrEvalExpected;
}

export interface OcrSyntheticFixtureOutput {
  sourcePdf: Buffer;
  expectedJson: string;
}

export const OCR_SYNTHETIC_FIXTURE_CASES: OcrSyntheticFixtureCase[] = [
  {
    id: 'cra-synthetic-t4-clean',
    slipType: 't4',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4 with common employment boxes.',
    expected: {
      issuerName: 'Acme Payroll Inc.',
      taxYear: 2025,
      boxes: {
        box14: 52000,
        box16: 3200,
        box18: 850.25,
        box22: 7800,
        box24: 52000,
        box26: 52000,
        box45: '1',
      },
    },
  },
  {
    id: 'cra-synthetic-t4a-clean',
    slipType: 't4a',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4A scholarship and tax withheld case.',
    expected: {
      issuerName: 'Example University',
      taxYear: 2025,
      boxes: {
        box022: 125,
        box105: 2030,
      },
    },
  },
  {
    id: 'cra-synthetic-t2202-clean',
    slipType: 't2202',
    variant: 'clean-pdf',
    description: 'Clean synthetic T2202 tuition and enrolment case.',
    expected: {
      issuerName: 'Example College',
      taxYear: 2025,
      boxes: {
        boxA: 6200,
        boxB: 0,
        boxC: 8,
      },
    },
  },
];

export function getOcrSyntheticFixtureCases(
  slipTypes?: ExtractableSlipType[],
): OcrSyntheticFixtureCase[] {
  if (!slipTypes || slipTypes.length === 0) {
    return OCR_SYNTHETIC_FIXTURE_CASES;
  }

  const requested = new Set(slipTypes);
  return OCR_SYNTHETIC_FIXTURE_CASES.filter((fixtureCase) => requested.has(fixtureCase.slipType));
}

export function validateOcrSyntheticFixtureCase(fixtureCase: OcrSyntheticFixtureCase): void {
  const engineType = PIPELINE_TO_ENGINE_TYPE[fixtureCase.slipType];
  const supportedFields = new Set(
    (SLIP_FIELDS[engineType] ?? [])
      .filter((field) => field.key !== 'issuerName' && field.key !== 'institutionName')
      .map((field) => field.key),
  );

  if (!fixtureCase.expected.issuerName || !fixtureCase.expected.taxYear) {
    throw new Error(`${fixtureCase.id} must include expected issuerName and taxYear.`);
  }

  for (const key of Object.keys(fixtureCase.expected.boxes)) {
    if (!supportedFields.has(key)) {
      throw new Error(`${fixtureCase.id} references unsupported ${fixtureCase.slipType} field: ${key}`);
    }
  }
}

export function buildOcrSyntheticFixtureOutput(
  fixtureCase: OcrSyntheticFixtureCase,
): OcrSyntheticFixtureOutput {
  validateOcrSyntheticFixtureCase(fixtureCase);

  return {
    sourcePdf: renderSyntheticSlipPdf(fixtureCase),
    expectedJson: `${JSON.stringify(fixtureCase.expected, null, 2)}\n`,
  };
}

function renderSyntheticSlipPdf(fixtureCase: OcrSyntheticFixtureCase): Buffer {
  const engineType = PIPELINE_TO_ENGINE_TYPE[fixtureCase.slipType];
  const lines = [
    'TaxAgent.ai private OCR synthetic fixture',
    `Slip type: ${engineType}`,
    `Fixture id: ${fixtureCase.id}`,
    `Description: ${fixtureCase.description}`,
    `Issuer name: ${fixtureCase.expected.issuerName}`,
    `Tax year: ${fixtureCase.expected.taxYear}`,
    '',
    'Printed boxes:',
    ...Object.entries(fixtureCase.expected.boxes).map(
      ([key, value]) => `${formatBoxLabel(key)}: ${formatOcrValue(value)}`,
    ),
    '',
    'This file contains fake data for local OCR benchmarking only.',
  ];

  return buildSimpleTextPdf(lines);
}

function formatBoxLabel(key: string): string {
  if (key.startsWith('box')) {
    return `Box ${key.slice(3)}`;
  }
  return key;
}

function formatOcrValue(value: OcrEvalValue): string {
  return typeof value === 'number' ? value.toFixed(Number.isInteger(value) ? 0 : 2) : value;
}

function buildSimpleTextPdf(lines: string[]): Buffer {
  const content = lines
    .map((line, index) => `BT /F1 11 Tf 72 ${760 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n');
  const contentLength = Buffer.byteLength(content, 'utf8');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
