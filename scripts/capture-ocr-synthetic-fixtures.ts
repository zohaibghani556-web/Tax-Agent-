#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { extractSlip } from '../src/lib/extraction';
import { buildOcrEvalFixtureFromPipelineResult } from '../src/lib/extraction/ocr-fixture';
import { OCR_SYNTHETIC_FIXTURE_CASES } from '../src/lib/extraction/ocr-synthetic-fixtures';
import { OCR_SYNTHETIC_IMAGE_FIXTURE_CASES, getBaseSyntheticFixtureCase } from '../src/lib/extraction/ocr-synthetic-image-variants';
import { isExtractable } from '../src/lib/extraction/schemas';
import { loadLocalEnv } from './lib/load-local-env';
import type { ExtractableSlipType } from '../src/lib/extraction/types';
import type { OcrEvalExpected } from '../src/lib/extraction/ocr-eval';

type CaptureSet = 'pdf' | 'images' | 'all';

interface CaptureArgs {
  outputRoot: string;
  set: CaptureSet;
  slipTypes: ExtractableSlipType[];
  force: boolean;
  continueOnFailure: boolean;
  delayMs: number;
  limit?: number;
}

interface CaptureTarget {
  id: string;
  slipType: ExtractableSlipType;
  sourcePath: string;
  expectedPath: string;
  outputPath: string;
  description: string;
}

const DEFAULT_OUTPUT_ROOT = 'ocr-fixtures/private';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function usage(): never {
  console.error(`Usage:
  npm run capture:ocr-synthetic-fixtures
  npm run capture:ocr-synthetic-fixtures -- --set pdf
  npm run capture:ocr-synthetic-fixtures -- --set images --slip-type t4 --limit 4
  npm run capture:ocr-synthetic-fixtures -- --force --delay-ms 5000

This command calls the local OCR extraction pipeline for generated private
synthetic fixtures. It writes captured outputs under ocr-fixtures/private and
does not call Supabase or production commands.

By default, the command stops after the first extraction_failed result so API
rate limits do not create a long run of misleading OCR failures. Use
--continue-on-failure only when intentionally collecting failure fixtures.`);
  process.exit(1);
}

function parseArgs(argv: string[]): CaptureArgs {
  let outputRoot = DEFAULT_OUTPUT_ROOT;
  let set: CaptureSet = 'all';
  let force = false;
  let continueOnFailure = false;
  let delayMs = 0;
  let limit: number | undefined;
  const slipTypes: ExtractableSlipType[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--out') {
      if (!value || value.startsWith('--')) usage();
      outputRoot = value;
      index += 1;
      continue;
    }

    if (arg === '--set') {
      if (value !== 'pdf' && value !== 'images' && value !== 'all') usage();
      set = value;
      index += 1;
      continue;
    }

    if (arg === '--slip-type') {
      if (!value || value.startsWith('--') || !isExtractable(value)) usage();
      slipTypes.push(value);
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      if (!value || value.startsWith('--')) usage();
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) usage();
      limit = parsed;
      index += 1;
      continue;
    }

    if (arg === '--delay-ms') {
      if (!value || value.startsWith('--')) usage();
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) usage();
      delayMs = parsed;
      index += 1;
      continue;
    }

    if (arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--continue-on-failure') {
      continueOnFailure = true;
      continue;
    }

    usage();
  }

  return { outputRoot, set, slipTypes, force, continueOnFailure, delayMs, limit };
}

function assertPrivateOutputRoot(outputRoot: string): void {
  const normalized = path.resolve(outputRoot).split(path.sep).join('/');
  const allowed = normalized.endsWith('/ocr-fixtures/private')
    || normalized.includes('/ocr-fixtures/private/');

  if (!allowed) {
    throw new Error('Refusing to write captured OCR fixtures outside ocr-fixtures/private/.');
  }
}

function buildTargets(args: CaptureArgs): CaptureTarget[] {
  const requested = new Set(args.slipTypes);
  const includeSlip = (slipType: ExtractableSlipType) => requested.size === 0 || requested.has(slipType);
  const targets: CaptureTarget[] = [];

  if (args.set === 'pdf' || args.set === 'all') {
    for (const fixtureCase of OCR_SYNTHETIC_FIXTURE_CASES) {
      if (!includeSlip(fixtureCase.slipType)) continue;
      targets.push({
        id: fixtureCase.id,
        slipType: fixtureCase.slipType,
        sourcePath: path.join(args.outputRoot, 'source', 'cra-synthetic', `${fixtureCase.id}.pdf`),
        expectedPath: path.join(args.outputRoot, 'expected', 'cra-synthetic', `${fixtureCase.id}.json`),
        outputPath: path.join(args.outputRoot, 'captured', 'cra-synthetic', `${fixtureCase.id}.json`),
        description: fixtureCase.description,
      });
    }
  }

  if (args.set === 'images' || args.set === 'all') {
    for (const imageCase of OCR_SYNTHETIC_IMAGE_FIXTURE_CASES) {
      const baseCase = getBaseSyntheticFixtureCase(imageCase.baseCaseId);
      if (!includeSlip(baseCase.slipType)) continue;
      const extension = imageCase.imageVariant.endsWith('jpeg') ? 'jpg' : 'png';
      targets.push({
        id: imageCase.id,
        slipType: baseCase.slipType,
        sourcePath: path.join(args.outputRoot, 'source', 'cra-synthetic-images', `${imageCase.id}.${extension}`),
        expectedPath: path.join(args.outputRoot, 'expected', 'cra-synthetic-images', `${imageCase.id}.json`),
        outputPath: path.join(args.outputRoot, 'captured', 'cra-synthetic-images', `${imageCase.id}.json`),
        description: imageCase.description,
      });
    }
  }

  return typeof args.limit === 'number' ? targets.slice(0, args.limit) : targets;
}

function mediaTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = MIME_BY_EXTENSION[ext];
  if (!mediaType) {
    throw new Error(`Unsupported fixture source file extension: ${ext || '(none)'}`);
  }
  return mediaType;
}

function readExpected(expectedPath: string): OcrEvalExpected {
  const parsed = JSON.parse(fs.readFileSync(expectedPath, 'utf8')) as OcrEvalExpected;
  if (!parsed.boxes || typeof parsed.boxes !== 'object') {
    throw new Error(`Expected fixture JSON must include a boxes object: ${expectedPath}`);
  }
  return parsed;
}

function assertTargetFilesExist(targets: CaptureTarget[]): void {
  for (const target of targets) {
    if (!fs.existsSync(target.sourcePath)) {
      throw new Error(`Missing generated source fixture: ${target.sourcePath}`);
    }
    if (!fs.existsSync(target.expectedPath)) {
      throw new Error(`Missing generated expected fixture: ${target.expectedPath}`);
    }
  }
}

async function captureTarget(target: CaptureTarget): Promise<string> {
  const fileBuffer = fs.readFileSync(target.sourcePath);
  const result = await extractSlip({
    base64: fileBuffer.toString('base64'),
    mediaType: mediaTypeFor(target.sourcePath),
    manualSlipType: target.slipType,
  });

  const fixture = buildOcrEvalFixtureFromPipelineResult({
    id: target.id,
    slipType: target.slipType,
    description: target.description,
    expected: readExpected(target.expectedPath),
    result,
  });

  fs.mkdirSync(path.dirname(target.outputPath), { recursive: true });
  fs.writeFileSync(target.outputPath, `${JSON.stringify(fixture, null, 2)}\n`);

  console.log(`${target.id}: ${result.status}; boxes=${Object.keys(result.boxes ?? {}).length}`);
  return result.status;
}

async function main(): Promise<void> {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  assertPrivateOutputRoot(args.outputRoot);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required to capture OCR fixtures.');
  }

  const targets = buildTargets(args).filter((target) => args.force || !fs.existsSync(target.outputPath));
  if (targets.length === 0) {
    console.log('No OCR synthetic fixtures to capture. Use --force to recapture existing outputs.');
    return;
  }

  assertTargetFilesExist(targets);

  console.log(`Capturing ${targets.length} OCR synthetic fixtures...`);
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const status = await captureTarget(target);
    if (status === 'extraction_failed' && !args.continueOnFailure) {
      throw new Error(
        `Stopping after extraction_failed for ${target.id}. ` +
        'If this was a transient API/rate-limit failure, wait and rerun this slip with --force.',
      );
    }
    if (args.delayMs > 0 && index < targets.length - 1) {
      await sleep(args.delayMs);
    }
  }
  console.log('Done. Run eval with:');
  console.log(`  npm run eval:ocr -- ${path.join(args.outputRoot, 'captured')}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
