import {
  evaluateOcrFixtures,
  summarizeOcrEvalResults,
} from './ocr-eval';
import type { ExtractableSlipType } from './types';
import type { OcrEvalFixture, OcrEvalResult } from './ocr-eval';

export interface OcrEvalReportGroup {
  key: string;
  slipType?: ExtractableSlipType;
  variant?: string;
  totalFixtures: number;
  passedFixtures: number;
  failedFixtures: number;
  averageFieldAccuracy: number;
  expectedFieldCount: number;
  matchedFieldCount: number;
  missingFieldCount: number;
  mismatchedFieldCount: number;
  unexpectedFieldCount: number;
  lowConfidenceFieldCount: number;
  blockingFlagCount: number;
}

export interface OcrEvalReport {
  overall: OcrEvalReportGroup;
  bySlipType: OcrEvalReportGroup[];
  byVariant: OcrEvalReportGroup[];
  bySlipTypeAndVariant: OcrEvalReportGroup[];
  failedResults: OcrEvalResult[];
}

interface GroupSeed {
  key: string;
  slipType?: ExtractableSlipType;
  variant?: string;
  results: OcrEvalResult[];
}

export function buildOcrEvalReport(fixtures: OcrEvalFixture[]): OcrEvalReport {
  const results = evaluateOcrFixtures(fixtures);

  return {
    overall: buildReportGroup({ key: 'overall', results }),
    bySlipType: groupResults(results, (result) => ({
      key: result.slipType,
      slipType: result.slipType,
    })),
    byVariant: groupResults(results, (result) => ({
      key: variantFromFixtureId(result.fixtureId),
      variant: variantFromFixtureId(result.fixtureId),
    })),
    bySlipTypeAndVariant: groupResults(results, (result) => {
      const variant = variantFromFixtureId(result.fixtureId);
      return {
        key: `${result.slipType}:${variant}`,
        slipType: result.slipType,
        variant,
      };
    }),
    failedResults: results.filter((result) => result.status === 'fail'),
  };
}

export function variantFromFixtureId(fixtureId: string): string {
  if (fixtureId.endsWith('-phone-screenshot-png')) return 'phone-screenshot';
  if (fixtureId.endsWith('-rotated-png')) return 'rotated';
  if (fixtureId.endsWith('-low-contrast-jpeg')) return 'low-contrast';
  if (fixtureId.endsWith('-compressed-jpeg')) return 'compressed';
  if (fixtureId.endsWith('-duplicate-copy')) return 'duplicate-copy';
  if (fixtureId.endsWith('-sparse')) return 'sparse';
  if (fixtureId.endsWith('-dense')) return 'dense';
  if (fixtureId.endsWith('-clean')) return 'clean';
  return 'unknown';
}

function groupResults(
  results: OcrEvalResult[],
  keyFor: (result: OcrEvalResult) => Omit<GroupSeed, 'results'>,
): OcrEvalReportGroup[] {
  const groups = new Map<string, GroupSeed>();

  for (const result of results) {
    const groupKey = keyFor(result);
    const group = groups.get(groupKey.key) ?? { ...groupKey, results: [] };
    group.results.push(result);
    groups.set(groupKey.key, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(buildReportGroup);
}

function buildReportGroup(seed: GroupSeed): OcrEvalReportGroup {
  const summary = summarizeOcrEvalResults(seed.results);

  return {
    key: seed.key,
    slipType: seed.slipType,
    variant: seed.variant,
    totalFixtures: summary.totalFixtures,
    passedFixtures: summary.passedFixtures,
    failedFixtures: summary.failedFixtures,
    averageFieldAccuracy: summary.averageFieldAccuracy,
    expectedFieldCount: sum(seed.results, (result) => result.expectedFieldCount),
    matchedFieldCount: sum(seed.results, (result) => result.matchedFieldCount),
    missingFieldCount: sum(seed.results, (result) => result.missingFields.length),
    mismatchedFieldCount: sum(seed.results, (result) => result.mismatchedFields.length),
    unexpectedFieldCount: sum(seed.results, (result) => result.unexpectedFields.length),
    lowConfidenceFieldCount: sum(seed.results, (result) => result.lowConfidenceFields.length),
    blockingFlagCount: sum(seed.results, (result) => result.blockingFlags.length),
  };
}

function sum(results: OcrEvalResult[], valueFor: (result: OcrEvalResult) => number): number {
  return results.reduce((total, result) => total + valueFor(result), 0);
}
