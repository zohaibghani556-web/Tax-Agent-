import type { ExtractableSlipType } from './types';

export type OcrSourceTier = 'official-cra-form' | 'official-cra-sample' | 'issuer-receipt';
export type OcrFixtureStrategy =
  | 'fillable-pdf-synthetic'
  | 'sample-image-synthetic'
  | 'issuer-layout-private';

export interface OcrSlipSource {
  slipType: ExtractableSlipType;
  engineType: string;
  visualSourceTier: OcrSourceTier;
  formUrl?: string;
  infoUrl?: string;
  xsdFiles: string[];
  fixtureStrategy: OcrFixtureStrategy;
  priority: 'critical' | 'high' | 'medium';
  notes: string;
}

export const OCR_SLIP_SOURCES: OcrSlipSource[] = [
  {
    slipType: 't4',
    engineType: 'T4',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4.html',
    xsdFiles: ['scripts/cra-xsds/t4.xsd', 'scripts/cra-xsds/T619_T4.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'critical',
    notes: 'Primary employment slip; generate clean, screenshot, rotated, compressed, and duplicate-copy variants.',
  },
  {
    slipType: 't4a',
    engineType: 'T4A',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4a.html',
    xsdFiles: ['scripts/cra-xsds/t4a.xsd', 'scripts/cra-xsds/T619_T4A.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'critical',
    notes: 'High-risk other-income slip; cover scholarships, pension, tax withheld, fees for services, and other income.',
  },
  {
    slipType: 't2202',
    engineType: 'T2202',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2202.html',
    xsdFiles: ['scripts/cra-xsds/t2202.xsd', 'scripts/cra-xsds/T619_T2202.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'critical',
    notes: 'Tuition/month mapping is fragile; cover multiple sessions and part-time/full-time totals.',
  },
  {
    slipType: 't5',
    engineType: 'T5',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t5.html',
    xsdFiles: ['scripts/cra-xsds/t5.xsd', 'scripts/cra-xsds/T619_T5.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'high',
    notes: 'Investment income; cover interest, eligible dividends, non-eligible dividends, foreign income, and foreign tax.',
  },
  {
    slipType: 't5008',
    engineType: 'T5008',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t5008.html',
    xsdFiles: ['scripts/cra-xsds/t5008.xsd', 'scripts/cra-xsds/T619_T5008.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'high',
    notes: 'Securities transactions; cover proceeds, cost/book value, security description, quantity, and type code.',
  },
  {
    slipType: 't3',
    engineType: 'T3',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t3.html',
    xsdFiles: ['scripts/cra-xsds/t3.xsd', 'scripts/cra-xsds/T619_T3.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'high',
    notes: 'Trust allocations; cover capital gains, dividends, foreign income/tax, interest, and other income.',
  },
  {
    slipType: 't4e',
    engineType: 'T4E',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4e.html',
    xsdFiles: ['scripts/cra-xsds/t4e.xsd', 'scripts/cra-xsds/T619_T4E.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'medium',
    notes: 'Employment insurance; cover total benefits and tax deducted.',
  },
  {
    slipType: 't5007',
    engineType: 'T5007',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t5007.html',
    xsdFiles: ['scripts/cra-xsds/t5007.xsd', 'scripts/cra-xsds/T619_T5007.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'medium',
    notes: 'Benefits statement; cover Box 10 social assistance/workers compensation amount.',
  },
  {
    slipType: 't4ap',
    engineType: 'T4AP',
    visualSourceTier: 'official-cra-sample',
    infoUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/tax-slips/understand-your-tax-slips/t4-slips/t4a-p-statement-canada-pension-plan-benefits.html',
    xsdFiles: ['scripts/cra-xsds/t4a-p.xsd', 'scripts/cra-xsds/T619_T4A_P.xsd'],
    fixtureStrategy: 'sample-image-synthetic',
    priority: 'medium',
    notes: 'Service Canada sample/info source; build synthetic visual fixtures from sample layout without adding a new slip type.',
  },
  {
    slipType: 't4aoas',
    engineType: 'T4AOAS',
    visualSourceTier: 'official-cra-sample',
    infoUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/tax-slips/understand-your-tax-slips/t4-slips/t4a-oas-statement-old-security.html',
    xsdFiles: ['scripts/cra-xsds/t4a-oas.xsd', 'scripts/cra-xsds/T619_T4A_OAS.xsd'],
    fixtureStrategy: 'sample-image-synthetic',
    priority: 'medium',
    notes: 'Service Canada sample/info source; cover OAS pension, supplements, overpayment recovery, and tax deducted.',
  },
  {
    slipType: 't4rsp',
    engineType: 'T4RSP',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4rsp.html',
    xsdFiles: ['scripts/cra-xsds/t4rsp.xsd', 'scripts/cra-xsds/T619_T4RSP.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'medium',
    notes: 'RRSP income/withdrawal slip; cover withdrawals, tax withheld, and transfer boxes.',
  },
  {
    slipType: 't4rif',
    engineType: 'T4RIF',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4rif.html',
    xsdFiles: ['scripts/cra-xsds/t4rif.xsd', 'scripts/cra-xsds/T619_T4RIF.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'medium',
    notes: 'RRIF income slip; cover taxable amounts, tax withheld, excess amounts, and other income/deductions.',
  },
  {
    slipType: 'rrsp_receipt',
    engineType: 'RRSP-Receipt',
    visualSourceTier: 'issuer-receipt',
    infoUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html',
    xsdFiles: ['scripts/cra-xsds/rrsp.xsd', 'scripts/cra-xsds/T619_RRSP.xsd'],
    fixtureStrategy: 'issuer-layout-private',
    priority: 'high',
    notes: 'Contribution receipts are issuer-generated rather than a single CRA slip layout; use private/synthetic issuer-style layouts.',
  },
  {
    slipType: 't4fhsa',
    engineType: 'T4FHSA',
    visualSourceTier: 'official-cra-form',
    formUrl: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t4fhsa.html',
    xsdFiles: ['scripts/cra-xsds/t4fhsa.xsd', 'scripts/cra-xsds/T619_T4FHSA.xsd'],
    fixtureStrategy: 'fillable-pdf-synthetic',
    priority: 'medium',
    notes: 'FHSA statement; cover contributions, transfers, withdrawals, and tax withheld where supported by app fields.',
  },
];

export const OCR_ENGINE_RESEARCH_SOURCES = [
  {
    name: 'Anthropic Claude PDF support',
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/pdf-support',
    role: 'Current primary OCR/extraction engine; supports PDFs as text plus page images.',
  },
  {
    name: 'Anthropic Vision',
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/vision',
    role: 'Current image understanding path for JPEG/PNG/WebP slips.',
  },
  {
    name: 'OpenAI Vision',
    url: 'https://platform.openai.com/docs/guides/vision',
    role: 'Candidate comparison engine for images; evaluate only behind local/private benchmark adapter.',
  },
  {
    name: 'OpenAI PDF inputs',
    url: 'https://platform.openai.com/docs/guides/pdf-files',
    role: 'Candidate comparison engine for PDFs; evaluate only behind local/private benchmark adapter.',
  },
  {
    name: 'Google Document AI Form Parser',
    url: 'https://docs.cloud.google.com/document-ai/docs/form-parser',
    role: 'Candidate specialized form/table extractor; paid service and not production-wired by default.',
  },
  {
    name: 'AWS Textract AnalyzeDocument',
    url: 'https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeDocument.html',
    role: 'Candidate forms/tables OCR baseline; paid service and not production-wired by default.',
  },
  {
    name: 'Mistral OCR',
    url: 'https://docs.mistral.ai/capabilities/OCR/basic_ocr/',
    role: 'Candidate OCR baseline with markdown/table extraction.',
  },
  {
    name: 'PaddleOCR',
    url: 'https://github.com/PaddlePaddle/PaddleOCR',
    role: 'Open-source local OCR/document parsing baseline, useful for degradation testing.',
  },
  {
    name: 'docTR',
    url: 'https://github.com/mindee/doctr',
    role: 'Open-source OCR baseline for word detection/recognition experiments.',
  },
  {
    name: 'Tesseract OCR',
    url: 'https://tesseract-ocr.github.io/',
    role: 'Open-source OCR baseline for deterministic local OCR experiments.',
  },
  {
    name: 'PyMuPDF',
    url: 'https://pymupdf.readthedocs.io/en/latest/the-basics.html',
    role: 'PDF text/image extraction and rendering candidate for preprocessing.',
  },
  {
    name: 'Apache PDFBox',
    url: 'https://pdfbox.apache.org/',
    role: 'PDF text/form extraction and rendering candidate for preprocessing.',
  },
] as const;

export const PUBLIC_DOCUMENT_DATASET_SOURCES = [
  {
    name: 'FUNSD',
    url: 'https://huggingface.co/papers/1905.13538',
    role: 'Noisy scanned form understanding benchmark.',
  },
  {
    name: 'SROIE',
    url: 'https://huggingface.co/datasets/jsdnrs/ICDAR2019-SROIE',
    role: 'Scanned receipt OCR and key information extraction benchmark.',
  },
  {
    name: 'DocVQA',
    url: 'https://www.docvqa.org/datasets/docvqa',
    role: 'Document image question answering and OCR/layout benchmark.',
  },
  {
    name: 'Kleister Charity',
    url: 'https://huggingface.co/datasets/orgrctera/kleister_charity_information_extraction',
    role: 'Long-form key information extraction benchmark for complex layouts.',
  },
  {
    name: 'RVL-CDIP',
    url: 'https://huggingface.co/datasets/hf-tuner/rvl-cdip-document-classification',
    role: 'Document image classification benchmark for routing/classification research.',
  },
] as const;

export function getOcrSlipSource(slipType: ExtractableSlipType): OcrSlipSource {
  const source = OCR_SLIP_SOURCES.find((entry) => entry.slipType === slipType);
  if (!source) {
    throw new Error(`No OCR source manifest entry for slip type: ${slipType}`);
  }
  return source;
}
