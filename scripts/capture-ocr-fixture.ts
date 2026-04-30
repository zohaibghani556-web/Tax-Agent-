#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { extractSlip } from '../src/lib/extraction';
import { isExtractable } from '../src/lib/extraction/schemas';
import { buildOcrEvalFixtureFromPipelineResult } from '../src/lib/extraction/ocr-fixture';
import { loadLocalEnv } from './lib/load-local-env';
import type { ExtractableSlipType } from '../src/lib/extraction/types';
import type { OcrEvalExpected } from '../src/lib/extraction/ocr-eval';

interface CaptureArgs {
  filePath: string;
  slipType: ExtractableSlipType;
  expectedPath: string;
  outputPath: string;
  id: string;
  description?: string;
  allowPublicOutput: boolean;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function usage(): never {
  console.error(`Usage:
  npm run capture:ocr-fixture -- \\
    --file path/to/slip.pdf \\
    --slip-type t4 \\
    --expected ocr-fixtures/private/expected/t4-001.json \\
    --out ocr-fixtures/private/captured/t4-001.json \\
    --id private-t4-001

Expected JSON shape:
  {
    "issuerName": "Redacted Employer",
    "taxYear": 2025,
    "boxes": { "box14": 50000, "box22": 9000 }
  }

This command calls the OCR extraction pipeline locally. It does not call Supabase
or persist documents. Output is restricted to ignored private fixture paths by
default.`);
  process.exit(1);
}

function parseArgs(argv: string[]): CaptureArgs {
  const values = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) usage();

    const key = arg.slice(2);
    if (key === 'allow-public-output') {
      values.set(key, true);
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) usage();
    values.set(key, value);
    index += 1;
  }

  const filePath = stringArg(values, 'file');
  const slipTypeRaw = stringArg(values, 'slip-type');
  const expectedPath = stringArg(values, 'expected');
  const outputPath = stringArg(values, 'out');
  const id = stringArg(values, 'id');

  if (!isExtractable(slipTypeRaw)) {
    throw new Error(`Unsupported slip type for OCR capture: ${slipTypeRaw}`);
  }

  return {
    filePath,
    slipType: slipTypeRaw,
    expectedPath,
    outputPath,
    id,
    description: typeof values.get('description') === 'string'
      ? values.get('description') as string
      : undefined,
    allowPublicOutput: values.get('allow-public-output') === true,
  };
}

function stringArg(values: Map<string, string | boolean>, key: string): string {
  const value = values.get(key);
  if (typeof value !== 'string' || value.length === 0) usage();
  return value;
}

function mediaTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = MIME_BY_EXTENSION[ext];
  if (!mediaType) {
    throw new Error(`Unsupported fixture source file extension: ${ext || '(none)'}`);
  }
  return mediaType;
}

function assertPrivateOutput(outputPath: string, allowPublicOutput: boolean): void {
  if (allowPublicOutput) return;

  const normalized = outputPath.split(path.sep).join('/');
  const allowed =
    normalized.startsWith('ocr-fixtures/private/') ||
    normalized.includes('/ocr-fixtures/private/') ||
    normalized.startsWith('src/lib/extraction/fixtures/ocr-eval/private/') ||
    normalized.includes('/src/lib/extraction/fixtures/ocr-eval/private/');

  if (!allowed) {
    throw new Error(
      'Refusing to write captured OCR fixture outside ignored private fixture paths. ' +
      'Use ocr-fixtures/private/... or src/lib/extraction/fixtures/ocr-eval/private/...',
    );
  }
}

function readExpected(expectedPath: string): OcrEvalExpected {
  const parsed = JSON.parse(fs.readFileSync(expectedPath, 'utf8')) as OcrEvalExpected;
  if (!parsed.boxes || typeof parsed.boxes !== 'object') {
    throw new Error('Expected fixture JSON must include a boxes object.');
  }
  return parsed;
}

async function main(): Promise<void> {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  assertPrivateOutput(args.outputPath, args.allowPublicOutput);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required to capture an OCR fixture.');
  }

  const fileBuffer = fs.readFileSync(args.filePath);
  const result = await extractSlip({
    base64: fileBuffer.toString('base64'),
    mediaType: mediaTypeFor(args.filePath),
    manualSlipType: args.slipType,
  });

  const fixture = buildOcrEvalFixtureFromPipelineResult({
    id: args.id,
    slipType: args.slipType,
    description: args.description,
    expected: readExpected(args.expectedPath),
    result,
  });

  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
  fs.writeFileSync(args.outputPath, `${JSON.stringify(fixture, null, 2)}\n`);

  console.log(`Captured OCR fixture: ${args.outputPath}`);
  console.log(`Status: ${result.status}`);
  console.log(`Boxes: ${Object.keys(result.boxes ?? {}).length}`);
  console.log('Run eval with:');
  console.log(`  npm run eval:ocr -- ${args.outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
