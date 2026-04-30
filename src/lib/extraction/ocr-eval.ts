import { PIPELINE_TO_ENGINE_TYPE } from './schemas';
import { SLIP_FIELDS } from '@/lib/slips/slip-fields';
import { isBlankReviewValue } from '@/lib/slips/review-values';
import type { ExtractableSlipType } from './types';

export type OcrEvalValue = number | string;
export type OcrEvalStatus = 'pass' | 'fail';

export interface OcrEvalFlag {
  field: string;
  reason: string;
  message?: string;
}

export interface OcrEvalActual {
  slipType?: string;
  issuerName?: string;
  taxYear?: number;
  boxes?: Record<string, OcrEvalValue> | null;
  status?: string;
  flags?: OcrEvalFlag[];
}

export interface OcrEvalExpected {
  issuerName?: string;
  taxYear?: number;
  boxes: Record<string, OcrEvalValue>;
}

export interface OcrEvalOptions {
  numericTolerance?: number;
  compareIssuerName?: boolean;
  compareTaxYear?: boolean;
  allowUnexpectedBoxes?: boolean;
  minFieldAccuracy?: number;
  failOnBlockingFlags?: boolean;
}

export interface OcrEvalFixture {
  id: string;
  slipType: ExtractableSlipType;
  description?: string;
  expected: OcrEvalExpected;
  actual?: OcrEvalActual;
  options?: OcrEvalOptions;
}

export interface OcrEvalMismatch {
  field: string;
  expected: OcrEvalValue;
  actual: OcrEvalValue | null;
  reason: 'missing' | 'value_mismatch' | 'unexpected' | 'unknown_field';
}

export interface OcrEvalResult {
  fixtureId: string;
  slipType: ExtractableSlipType;
  status: OcrEvalStatus;
  fieldAccuracy: number;
  matchedFieldCount: number;
  expectedFieldCount: number;
  missingFields: OcrEvalMismatch[];
  mismatchedFields: OcrEvalMismatch[];
  unexpectedFields: OcrEvalMismatch[];
  invalidExpectedFields: string[];
  invalidActualFields: string[];
  metadataMismatches: OcrEvalMismatch[];
  blockingFlags: OcrEvalFlag[];
  lowConfidenceFields: string[];
}

export interface OcrEvalSummary {
  totalFixtures: number;
  passedFixtures: number;
  failedFixtures: number;
  averageFieldAccuracy: number;
}

const DEFAULT_NUMERIC_TOLERANCE = 0.01;

function optionsFor(fixture: OcrEvalFixture): Required<OcrEvalOptions> {
  return {
    numericTolerance: fixture.options?.numericTolerance ?? DEFAULT_NUMERIC_TOLERANCE,
    compareIssuerName: fixture.options?.compareIssuerName ?? true,
    compareTaxYear: fixture.options?.compareTaxYear ?? true,
    allowUnexpectedBoxes: fixture.options?.allowUnexpectedBoxes ?? false,
    minFieldAccuracy: fixture.options?.minFieldAccuracy ?? 1,
    failOnBlockingFlags: fixture.options?.failOnBlockingFlags ?? true,
  };
}

function configuredBoxKeys(slipType: ExtractableSlipType): Set<string> {
  const engineSlipType = PIPELINE_TO_ENGINE_TYPE[slipType];
  const keys = (SLIP_FIELDS[engineSlipType] ?? [])
    .filter((field) => field.key !== 'issuerName' && field.key !== 'institutionName')
    .map((field) => field.key);
  return new Set(keys);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function valuesEqual(
  expected: OcrEvalValue,
  actual: OcrEvalValue,
  numericTolerance: number,
): boolean {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(expected - actual) <= numericTolerance;
  }
  return normalizeText(String(expected)) === normalizeText(String(actual));
}

function isBlockingFlag(flag: OcrEvalFlag): boolean {
  return flag.reason === 'blank_extraction'
    || flag.reason === 'zod_error'
    || flag.reason === 'missing_required';
}

export function evaluateOcrFixture(
  fixture: OcrEvalFixture,
  actualOverride?: OcrEvalActual,
): OcrEvalResult {
  const options = optionsFor(fixture);
  const actual = actualOverride ?? fixture.actual;
  const actualBoxes = actual?.boxes ?? {};
  const configuredKeys = configuredBoxKeys(fixture.slipType);

  const invalidExpectedFields = Object.keys(fixture.expected.boxes)
    .filter((key) => !configuredKeys.has(key));
  const invalidActualFields = Object.keys(actualBoxes)
    .filter((key) => !configuredKeys.has(key));

  const missingFields: OcrEvalMismatch[] = [];
  const mismatchedFields: OcrEvalMismatch[] = [];
  let matchedFieldCount = 0;

  for (const [field, expected] of Object.entries(fixture.expected.boxes)) {
    const actualValue = actualBoxes[field];
    if (isBlankReviewValue(actualValue)) {
      missingFields.push({ field, expected, actual: null, reason: 'missing' });
      continue;
    }
    if (!valuesEqual(expected, actualValue, options.numericTolerance)) {
      mismatchedFields.push({
        field,
        expected,
        actual: actualValue,
        reason: 'value_mismatch',
      });
      continue;
    }
    matchedFieldCount += 1;
  }

  const unexpectedFields: OcrEvalMismatch[] = [];
  if (!options.allowUnexpectedBoxes) {
    const expectedKeys = new Set(Object.keys(fixture.expected.boxes));
    for (const [field, actualValue] of Object.entries(actualBoxes)) {
      if (expectedKeys.has(field) || invalidActualFields.includes(field) || isBlankReviewValue(actualValue)) {
        continue;
      }
      unexpectedFields.push({
        field,
        expected: '',
        actual: actualValue,
        reason: 'unexpected',
      });
    }
  }

  const metadataMismatches: OcrEvalMismatch[] = [];
  if (options.compareIssuerName && fixture.expected.issuerName !== undefined) {
    const actualIssuerName = actual?.issuerName ?? '';
    if (!valuesEqual(fixture.expected.issuerName, actualIssuerName, options.numericTolerance)) {
      metadataMismatches.push({
        field: 'issuerName',
        expected: fixture.expected.issuerName,
        actual: actualIssuerName,
        reason: 'value_mismatch',
      });
    }
  }
  if (options.compareTaxYear && fixture.expected.taxYear !== undefined) {
    const actualTaxYear = actual?.taxYear;
    if (actualTaxYear === undefined || !valuesEqual(fixture.expected.taxYear, actualTaxYear, options.numericTolerance)) {
      metadataMismatches.push({
        field: 'taxYear',
        expected: fixture.expected.taxYear,
        actual: actualTaxYear ?? null,
        reason: actualTaxYear === undefined ? 'missing' : 'value_mismatch',
      });
    }
  }

  const expectedFieldCount = Object.keys(fixture.expected.boxes).length;
  const fieldAccuracy = expectedFieldCount === 0
    ? 1
    : matchedFieldCount / expectedFieldCount;
  const flags = actual?.flags ?? [];
  const blockingFlags = options.failOnBlockingFlags ? flags.filter(isBlockingFlag) : [];
  const lowConfidenceFields = flags
    .filter((flag) => flag.reason === 'low_confidence')
    .map((flag) => flag.field);

  const status: OcrEvalStatus =
    actual &&
    fieldAccuracy >= options.minFieldAccuracy &&
    missingFields.length === 0 &&
    mismatchedFields.length === 0 &&
    unexpectedFields.length === 0 &&
    invalidExpectedFields.length === 0 &&
    invalidActualFields.length === 0 &&
    metadataMismatches.length === 0 &&
    blockingFlags.length === 0
      ? 'pass'
      : 'fail';

  return {
    fixtureId: fixture.id,
    slipType: fixture.slipType,
    status,
    fieldAccuracy,
    matchedFieldCount,
    expectedFieldCount,
    missingFields,
    mismatchedFields,
    unexpectedFields,
    invalidExpectedFields,
    invalidActualFields,
    metadataMismatches,
    blockingFlags,
    lowConfidenceFields,
  };
}

export function evaluateOcrFixtures(fixtures: OcrEvalFixture[]): OcrEvalResult[] {
  return fixtures.map((fixture) => evaluateOcrFixture(fixture));
}

export function summarizeOcrEvalResults(results: OcrEvalResult[]): OcrEvalSummary {
  const totalFixtures = results.length;
  const passedFixtures = results.filter((result) => result.status === 'pass').length;
  const averageFieldAccuracy = totalFixtures === 0
    ? 0
    : results.reduce((sum, result) => sum + result.fieldAccuracy, 0) / totalFixtures;

  return {
    totalFixtures,
    passedFixtures,
    failedFixtures: totalFixtures - passedFixtures,
    averageFieldAccuracy,
  };
}
