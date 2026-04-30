#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import {
  buildOcrSyntheticFixtureOutput,
  getOcrSyntheticFixtureCases,
} from '../src/lib/extraction/ocr-synthetic-fixtures';
import { isExtractable } from '../src/lib/extraction/schemas';
import type { ExtractableSlipType } from '../src/lib/extraction/types';

interface GenerateArgs {
  slipTypes: ExtractableSlipType[];
  outputRoot: string;
}

const DEFAULT_OUTPUT_ROOT = 'ocr-fixtures/private';

function usage(): never {
  console.error(`Usage:
  npm run gen:ocr-synthetic-fixtures
  npm run gen:ocr-synthetic-fixtures -- --slip-type t4 --slip-type t4a --out ocr-fixtures/private

This command writes fake local OCR benchmark source PDFs and expected JSON to
ignored private fixture paths. It does not call OCR APIs, Supabase, or
production services.

Next capture command example:
  npm run capture:ocr-fixture -- \\
    --file ocr-fixtures/private/source/cra-synthetic/cra-synthetic-t4-clean.pdf \\
    --slip-type t4 \\
    --expected ocr-fixtures/private/expected/cra-synthetic/cra-synthetic-t4-clean.json \\
    --out ocr-fixtures/private/captured/cra-synthetic/cra-synthetic-t4-clean.json \\
    --id cra-synthetic-t4-clean
`);
  process.exit(1);
}

function parseArgs(argv: string[]): GenerateArgs {
  const slipTypes: ExtractableSlipType[] = [];
  let outputRoot = DEFAULT_OUTPUT_ROOT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--slip-type') {
      if (!value || value.startsWith('--') || !isExtractable(value)) usage();
      slipTypes.push(value);
      index += 1;
      continue;
    }

    if (arg === '--out') {
      if (!value || value.startsWith('--')) usage();
      outputRoot = value;
      index += 1;
      continue;
    }

    usage();
  }

  return { slipTypes, outputRoot };
}

function assertPrivateOutput(outputRoot: string): void {
  const normalized = path.resolve(outputRoot).split(path.sep).join('/');
  const allowed = normalized.endsWith('/ocr-fixtures/private')
    || normalized.includes('/ocr-fixtures/private/');

  if (!allowed) {
    throw new Error('Refusing to write synthetic OCR fixtures outside ocr-fixtures/private/.');
  }
}

function writeFile(filePath: string, data: string | Buffer): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  assertPrivateOutput(args.outputRoot);

  const cases = getOcrSyntheticFixtureCases(args.slipTypes);
  if (cases.length === 0) {
    throw new Error('No synthetic OCR fixture cases matched the requested slip types.');
  }

  const sourceDir = path.join(args.outputRoot, 'source', 'cra-synthetic');
  const expectedDir = path.join(args.outputRoot, 'expected', 'cra-synthetic');

  for (const fixtureCase of cases) {
    const output = buildOcrSyntheticFixtureOutput(fixtureCase);
    const sourcePath = path.join(sourceDir, `${fixtureCase.id}.pdf`);
    const expectedPath = path.join(expectedDir, `${fixtureCase.id}.json`);

    writeFile(sourcePath, output.sourcePdf);
    writeFile(expectedPath, output.expectedJson);

    console.log(`Generated ${fixtureCase.id}`);
    console.log(`  source:   ${sourcePath}`);
    console.log(`  expected: ${expectedPath}`);
    console.log('  capture:');
    console.log(`    npm run capture:ocr-fixture -- --file ${sourcePath} --slip-type ${fixtureCase.slipType} --expected ${expectedPath} --out ${path.join(args.outputRoot, 'captured', 'cra-synthetic', `${fixtureCase.id}.json`)} --id ${fixtureCase.id}`);
  }
}

main();
