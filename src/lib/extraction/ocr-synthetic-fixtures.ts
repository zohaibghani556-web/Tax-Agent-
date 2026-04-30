import { SLIP_FIELDS } from '@/lib/slips/slip-fields';
import { PIPELINE_TO_ENGINE_TYPE } from './schemas';
import type { ExtractableSlipType } from './types';
import type { OcrEvalExpected, OcrEvalValue } from './ocr-eval';

export type OcrSyntheticVariant =
  | 'clean-pdf'
  | 'sparse-pdf'
  | 'dense-pdf'
  | 'duplicate-copy-pdf';

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
    id: 'cra-synthetic-t4-sparse',
    slipType: 't4',
    variant: 'sparse-pdf',
    description: 'Sparse synthetic T4 with only primary employment income printed.',
    expected: {
      issuerName: 'Sparse Payroll Inc.',
      taxYear: 2025,
      boxes: {
        box14: 18500,
      },
    },
  },
  {
    id: 'cra-synthetic-t4-dense',
    slipType: 't4',
    variant: 'dense-pdf',
    description: 'Dense synthetic T4 with every app-supported T4 box printed.',
    expected: {
      issuerName: 'Dense Payroll Inc.',
      taxYear: 2025,
      boxes: {
        box14: 88000,
        box16: 4034.1,
        box16A: 188,
        box17: 0,
        box18: 1049.12,
        box20: 4200,
        box22: 16450,
        box24: 63200,
        box26: 68500,
        box40: 900,
        box42: 3500,
        box44: 540,
        box45: '1',
        box46: 250,
        box52: 5900,
        box55: 0,
        box85: 720,
      },
    },
  },
  {
    id: 'cra-synthetic-t4-duplicate-copy',
    slipType: 't4',
    variant: 'duplicate-copy-pdf',
    description: 'Synthetic T4 with the same printed copy repeated on one page.',
    expected: {
      issuerName: 'Duplicate Payroll Inc.',
      taxYear: 2025,
      boxes: {
        box14: 41000,
        box16: 2300,
        box18: 670,
        box22: 5200,
        box24: 41000,
        box26: 41000,
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
    id: 'cra-synthetic-t4a-sparse',
    slipType: 't4a',
    variant: 'sparse-pdf',
    description: 'Sparse synthetic T4A with only scholarship income printed.',
    expected: {
      issuerName: 'Sparse University',
      taxYear: 2025,
      boxes: {
        box105: 1500,
      },
    },
  },
  {
    id: 'cra-synthetic-t4a-dense',
    slipType: 't4a',
    variant: 'dense-pdf',
    description: 'Dense synthetic T4A with every app-supported T4A box printed.',
    expected: {
      issuerName: 'Dense Payer Inc.',
      taxYear: 2025,
      boxes: {
        box016: 1200,
        box018: 300,
        box020: 450,
        box022: 125,
        box024: 250,
        box028: 800,
        box048: 2100,
        box105: 2030,
        box122: 100,
        box130: 750,
        box135: 90,
      },
    },
  },
  {
    id: 'cra-synthetic-t4a-duplicate-copy',
    slipType: 't4a',
    variant: 'duplicate-copy-pdf',
    description: 'Synthetic T4A with the same printed copy repeated on one page.',
    expected: {
      issuerName: 'Duplicate University',
      taxYear: 2025,
      boxes: {
        box022: 180,
        box105: 2400,
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
  {
    id: 'cra-synthetic-t2202-sparse',
    slipType: 't2202',
    variant: 'sparse-pdf',
    description: 'Sparse synthetic T2202 with tuition printed and enrolment months omitted.',
    expected: {
      issuerName: 'Sparse College',
      taxYear: 2025,
      boxes: {
        boxA: 3250,
      },
    },
  },
  {
    id: 'cra-synthetic-t2202-duplicate-copy',
    slipType: 't2202',
    variant: 'duplicate-copy-pdf',
    description: 'Synthetic T2202 with the same printed copy repeated on one page.',
    expected: {
      issuerName: 'Duplicate College',
      taxYear: 2025,
      boxes: {
        boxA: 7100,
        boxB: 2,
        boxC: 6,
      },
    },
  },
  {
    id: 'cra-synthetic-t5-clean',
    slipType: 't5',
    variant: 'clean-pdf',
    description: 'Clean synthetic T5 with interest and dividends.',
    expected: {
      issuerName: 'Example Bank',
      taxYear: 2025,
      boxes: {
        box13: 420.5,
        box24: 600,
        box25: 828,
        box26: 127.55,
      },
    },
  },
  {
    id: 'cra-synthetic-t5008-clean',
    slipType: 't5008',
    variant: 'clean-pdf',
    description: 'Clean synthetic T5008 securities disposition.',
    expected: {
      issuerName: 'Example Brokerage',
      taxYear: 2025,
      boxes: {
        box15: 'SHR',
        box16: 'ABC Corp',
        box20: 6200,
        box21: 8500,
        box22: 100,
      },
    },
  },
  {
    id: 'cra-synthetic-t3-clean',
    slipType: 't3',
    variant: 'clean-pdf',
    description: 'Clean synthetic T3 trust income allocation.',
    expected: {
      issuerName: 'Example Trust',
      taxYear: 2025,
      boxes: {
        box21: 1200,
        box26: 300,
        box49: 380,
      },
    },
  },
  {
    id: 'cra-synthetic-t4e-clean',
    slipType: 't4e',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4E employment insurance benefits.',
    expected: {
      issuerName: 'Example Payer',
      taxYear: 2025,
      boxes: {
        box14: 8400,
        box22: 840,
      },
    },
  },
  {
    id: 'cra-synthetic-t5007-clean',
    slipType: 't5007',
    variant: 'clean-pdf',
    description: 'Clean synthetic T5007 benefits statement.',
    expected: {
      issuerName: 'Example Benefits Office',
      taxYear: 2025,
      boxes: {
        box10: 12000,
      },
    },
  },
  {
    id: 'cra-synthetic-t4ap-clean',
    slipType: 't4ap',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4A(P) CPP benefits.',
    expected: {
      issuerName: 'Example Payer',
      taxYear: 2025,
      boxes: {
        box16: 8400,
        box22: 840,
      },
    },
  },
  {
    id: 'cra-synthetic-t4aoas-clean',
    slipType: 't4aoas',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4A(OAS) benefits.',
    expected: {
      issuerName: 'Example Payer',
      taxYear: 2025,
      boxes: {
        box18: 7200,
        box21: 0,
        box22: 0,
      },
    },
  },
  {
    id: 'cra-synthetic-t4rsp-clean',
    slipType: 't4rsp',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4RSP withdrawal.',
    expected: {
      issuerName: 'Example Financial',
      taxYear: 2025,
      boxes: {
        box20: 10000,
        box22: 2000,
      },
    },
  },
  {
    id: 'cra-synthetic-t4rif-clean',
    slipType: 't4rif',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4RIF income.',
    expected: {
      issuerName: 'Example Financial',
      taxYear: 2025,
      boxes: {
        box16: 15000,
        box30: 1500,
      },
    },
  },
  {
    id: 'cra-synthetic-rrsp-receipt-clean',
    slipType: 'rrsp_receipt',
    variant: 'clean-pdf',
    description: 'Clean synthetic RRSP contribution receipt.',
    expected: {
      issuerName: 'Example Financial',
      taxYear: 2025,
      boxes: {
        amount: 5000,
        planType: 'RRSP',
        dateOfContribution: '2025-01-15',
      },
    },
  },
  {
    id: 'cra-synthetic-t4fhsa-clean',
    slipType: 't4fhsa',
    variant: 'clean-pdf',
    description: 'Clean synthetic T4FHSA contribution case.',
    expected: {
      issuerName: 'Example Financial',
      taxYear: 2025,
      boxes: {
        box14: 0,
        box22: 0,
        box24: 8000,
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
  const printedBoxLines = Object.entries(fixtureCase.expected.boxes).map(
    ([key, value]) => `${formatBoxLabel(key)}: ${formatOcrValue(value)}`,
  );
  const lines = [
    'TaxAgent.ai private OCR synthetic fixture',
    `Slip type: ${engineType}`,
    `Fixture id: ${fixtureCase.id}`,
    `Variant: ${fixtureCase.variant}`,
    `Description: ${fixtureCase.description}`,
    `Issuer name: ${fixtureCase.expected.issuerName}`,
    `Tax year: ${fixtureCase.expected.taxYear}`,
    '',
    'Printed boxes:',
    ...printedBoxLines,
    ...duplicateCopyLines(fixtureCase, printedBoxLines),
    '',
    'This file contains fake data for local OCR benchmarking only.',
  ];

  return buildSimpleTextPdf(lines);
}

function duplicateCopyLines(
  fixtureCase: OcrSyntheticFixtureCase,
  printedBoxLines: string[],
): string[] {
  if (fixtureCase.variant !== 'duplicate-copy-pdf') {
    return [];
  }

  return [
    '',
    'Second copy of the same slip:',
    `Slip type: ${PIPELINE_TO_ENGINE_TYPE[fixtureCase.slipType]}`,
    `Issuer name: ${fixtureCase.expected.issuerName}`,
    `Tax year: ${fixtureCase.expected.taxYear}`,
    ...printedBoxLines,
  ];
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
