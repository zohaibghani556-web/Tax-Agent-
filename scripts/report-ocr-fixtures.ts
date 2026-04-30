#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeOcrEvalFixturePayload,
} from '../src/lib/extraction/ocr-eval';
import {
  buildOcrEvalReport,
} from '../src/lib/extraction/ocr-eval-report';
import type { OcrEvalFixture } from '../src/lib/extraction/ocr-eval';
import type { OcrEvalReportGroup } from '../src/lib/extraction/ocr-eval-report';

const DEFAULT_FIXTURE_DIR = path.resolve(
  process.cwd(),
  'src/lib/extraction/fixtures/ocr-eval',
);

function readFixtureFile(filePath: string): OcrEvalFixture[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  return normalizeOcrEvalFixturePayload(JSON.parse(raw) as unknown);
}

function loadFixtures(targetPath: string): OcrEvalFixture[] {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return readFixtureFile(targetPath);
  }

  return fs.readdirSync(targetPath)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .flatMap((filename) => readFixtureFile(path.join(targetPath, filename)));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatGroup(group: OcrEvalReportGroup): string {
  return [
    group.key.padEnd(22),
    `${group.passedFixtures}/${group.totalFixtures}`.padStart(7),
    formatPercent(group.averageFieldAccuracy).padStart(8),
    `${group.matchedFieldCount}/${group.expectedFieldCount}`.padStart(10),
    String(group.missingFieldCount).padStart(7),
    String(group.mismatchedFieldCount).padStart(9),
    String(group.unexpectedFieldCount).padStart(10),
    String(group.lowConfidenceFieldCount).padStart(8),
    String(group.blockingFlagCount).padStart(8),
  ].join('  ');
}

function printSection(title: string, groups: OcrEvalReportGroup[]): void {
  console.log(`\n${title}`);
  console.log(formatHeader());
  for (const group of groups) {
    console.log(formatGroup(group));
  }
}

function formatHeader(): string {
  return [
    'group'.padEnd(22),
    'pass'.padStart(7),
    'accuracy'.padStart(8),
    'fields'.padStart(10),
    'missing'.padStart(7),
    'mismatch'.padStart(9),
    'unexpected'.padStart(10),
    'lowconf'.padStart(8),
    'blocking'.padStart(8),
  ].join('  ');
}

const targetPath = path.resolve(process.argv[2] ?? DEFAULT_FIXTURE_DIR);
const fixtures = loadFixtures(targetPath);
const report = buildOcrEvalReport(fixtures);

console.log(`OCR fixture report: ${targetPath}`);
console.log(`Loaded fixtures: ${fixtures.length}`);
console.log(`Overall: ${report.overall.passedFixtures}/${report.overall.totalFixtures} passed`);
console.log(`Average field accuracy: ${formatPercent(report.overall.averageFieldAccuracy)}`);
console.log(`Fields matched: ${report.overall.matchedFieldCount}/${report.overall.expectedFieldCount}`);
console.log(`Missing/mismatch/unexpected: ${report.overall.missingFieldCount}/${report.overall.mismatchedFieldCount}/${report.overall.unexpectedFieldCount}`);
console.log(`Low-confidence/blocking flags: ${report.overall.lowConfidenceFieldCount}/${report.overall.blockingFlagCount}`);

printSection('By slip type', report.bySlipType);
printSection('By variant', report.byVariant);
printSection('By slip type and variant', report.bySlipTypeAndVariant);

if (report.failedResults.length > 0) {
  console.log('\nFailures');
  for (const result of report.failedResults) {
    console.log(`- ${result.fixtureId} (${result.slipType})`);
  }
}
