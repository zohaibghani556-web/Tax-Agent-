import {
  OCR_SYNTHETIC_FIXTURE_CASES,
} from './ocr-synthetic-fixtures';
import type { OcrSyntheticFixtureCase } from './ocr-synthetic-fixtures';

export type OcrSyntheticImageVariant =
  | 'phone-screenshot-png'
  | 'rotated-png'
  | 'low-contrast-jpeg'
  | 'compressed-jpeg';

export interface OcrSyntheticImageFixtureCase {
  id: string;
  baseCaseId: string;
  imageVariant: OcrSyntheticImageVariant;
  description: string;
}

const PRIORITY_BASE_CASE_IDS = [
  'cra-synthetic-t4-clean',
  'cra-synthetic-t4a-clean',
  'cra-synthetic-t2202-clean',
  'cra-synthetic-t5-clean',
  'cra-synthetic-t5008-clean',
  'cra-synthetic-t3-clean',
  'cra-synthetic-t4e-clean',
  'cra-synthetic-t5007-clean',
  'cra-synthetic-t4ap-clean',
  'cra-synthetic-t4aoas-clean',
  'cra-synthetic-t4rsp-clean',
  'cra-synthetic-t4rif-clean',
  'cra-synthetic-rrsp-receipt-clean',
  'cra-synthetic-t4fhsa-clean',
];

const IMAGE_VARIANTS: Omit<OcrSyntheticImageFixtureCase, 'id' | 'baseCaseId'>[] = [
  {
    imageVariant: 'phone-screenshot-png',
    description: 'Tall phone-camera style PNG with padding and slight perspective-like framing.',
  },
  {
    imageVariant: 'rotated-png',
    description: 'PNG rotated slightly to exercise orientation robustness.',
  },
  {
    imageVariant: 'low-contrast-jpeg',
    description: 'Low-contrast JPEG to exercise faint scan handling.',
  },
  {
    imageVariant: 'compressed-jpeg',
    description: 'Low-quality compressed JPEG to exercise upload compression handling.',
  },
];

export const OCR_SYNTHETIC_IMAGE_FIXTURE_CASES: OcrSyntheticImageFixtureCase[] =
  PRIORITY_BASE_CASE_IDS.flatMap((baseCaseId) => (
    IMAGE_VARIANTS.map((variant) => ({
      id: `${baseCaseId}-${variant.imageVariant}`,
      baseCaseId,
      ...variant,
    }))
  ));

export function getBaseSyntheticFixtureCase(baseCaseId: string): OcrSyntheticFixtureCase {
  const fixtureCase = OCR_SYNTHETIC_FIXTURE_CASES.find((entry) => entry.id === baseCaseId);
  if (!fixtureCase) {
    throw new Error(`No base synthetic fixture case found for image variant: ${baseCaseId}`);
  }
  return fixtureCase;
}
