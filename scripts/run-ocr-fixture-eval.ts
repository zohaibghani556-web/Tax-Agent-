#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateOcrFixtures,
  summarizeOcrEvalResults,
} from '../src/lib/extraction/ocr-eval';
import type { OcrEvalFixture, OcrEvalResult } from '../src/lib/extraction/ocr-eval';

const DEFAULT_FIXTURE_DIR = path.resolve(
  process.cwd(),
  'src/lib/extraction/fixtures/ocr-eval',
);

function readFixtureFile(filePath: string): OcrEvalFixture[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as OcrEvalFixture[] | { fixtures: OcrEvalFixture[] };
  return Array.isArray(parsed) ? parsed : parsed.fixtures;
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

function describeFailure(result: OcrEvalResult): string[] {
  const lines = [`- ${result.fixtureId} (${result.slipType})`];
  for (const item of result.missingFields) {
    lines.push(`  missing ${item.field}: expected ${JSON.stringify(item.expected)}`);
  }
  for (const item of result.mismatchedFields) {
    lines.push(`  mismatch ${item.field}: expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(item.actual)}`);
  }
  for (const item of result.unexpectedFields) {
    lines.push(`  unexpected ${item.field}: got ${JSON.stringify(item.actual)}`);
  }
  for (const field of result.invalidExpectedFields) {
    lines.push(`  invalid expected field: ${field}`);
  }
  for (const field of result.invalidActualFields) {
    lines.push(`  invalid actual field: ${field}`);
  }
  for (const item of result.metadataMismatches) {
    lines.push(`  metadata ${item.field}: expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(item.actual)}`);
  }
  for (const flag of result.blockingFlags) {
    lines.push(`  blocking flag ${flag.field}: ${flag.reason}`);
  }
  return lines;
}

const targetPath = path.resolve(process.argv[2] ?? DEFAULT_FIXTURE_DIR);
const fixtures = loadFixtures(targetPath);
const results = evaluateOcrFixtures(fixtures);
const summary = summarizeOcrEvalResults(results);
const failed = results.filter((result) => result.status === 'fail');

console.log(`OCR fixture eval: ${summary.passedFixtures}/${summary.totalFixtures} fixtures passed`);
console.log(`Average field accuracy: ${formatPercent(summary.averageFieldAccuracy)}`);

if (failed.length > 0) {
  console.error('\nFailures:');
  for (const result of failed) {
    console.error(describeFailure(result).join('\n'));
  }
  process.exitCode = 1;
}
