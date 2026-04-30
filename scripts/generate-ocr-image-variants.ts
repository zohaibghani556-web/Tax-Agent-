#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import {
  OCR_SYNTHETIC_IMAGE_FIXTURE_CASES,
  getBaseSyntheticFixtureCase,
} from '../src/lib/extraction/ocr-synthetic-image-variants';
import type { OcrSyntheticImageVariant } from '../src/lib/extraction/ocr-synthetic-image-variants';
import type { OcrSyntheticFixtureCase } from '../src/lib/extraction/ocr-synthetic-fixtures';

interface SharpLike {
  (input: Buffer | string | { create: unknown }): SharpPipeline;
}

interface SharpPipeline {
  composite(input: unknown[]): SharpPipeline;
  extend(input: unknown): SharpPipeline;
  rotate(angle?: number, options?: unknown): SharpPipeline;
  modulate(input: unknown): SharpPipeline;
  png(input?: unknown): SharpPipeline;
  jpeg(input?: unknown): SharpPipeline;
  toBuffer(): Promise<Buffer>;
}

interface GenerateArgs {
  outputRoot: string;
}

const DEFAULT_OUTPUT_ROOT = 'ocr-fixtures/private';

function usage(): never {
  console.error(`Usage:
  npm run gen:ocr-image-variants
  npm run gen:ocr-image-variants -- --out ocr-fixtures/private

This command writes fake local image OCR benchmark sources and expected JSON to
ignored private fixture paths. It does not call OCR APIs, Supabase, or
production services.`);
  process.exit(1);
}

function parseArgs(argv: string[]): GenerateArgs {
  let outputRoot = DEFAULT_OUTPUT_ROOT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--out') {
      if (!value || value.startsWith('--')) usage();
      outputRoot = value;
      index += 1;
      continue;
    }

    usage();
  }

  return { outputRoot };
}

function assertPrivateOutput(outputRoot: string): void {
  const normalized = path.resolve(outputRoot).split(path.sep).join('/');
  const allowed = normalized.endsWith('/ocr-fixtures/private')
    || normalized.includes('/ocr-fixtures/private/');

  if (!allowed) {
    throw new Error('Refusing to write synthetic OCR image variants outside ocr-fixtures/private/.');
  }
}

function loadSharp(): SharpLike {
  try {
    // Keep sharp isolated to this local script. It is used for private fixture generation only.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('sharp') as SharpLike;
  } catch {
    throw new Error('sharp is required to generate OCR image variants. Run npm install if node_modules is incomplete.');
  }
}

function writeFile(filePath: string, data: string | Buffer): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
}

async function renderBasePng(sharp: SharpLike, fixtureCase: OcrSyntheticFixtureCase): Promise<Buffer> {
  const svg = renderSyntheticSlipSvg(fixtureCase);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function applyImageVariant(
  sharp: SharpLike,
  basePng: Buffer,
  variant: OcrSyntheticImageVariant,
): Promise<{ buffer: Buffer; extension: 'png' | 'jpg' }> {
  if (variant === 'phone-screenshot-png') {
    const buffer = await sharp(basePng)
      .extend({ top: 180, bottom: 220, left: 90, right: 90, background: '#f3f4f6' })
      .png()
      .toBuffer();
    return { buffer, extension: 'png' };
  }

  if (variant === 'rotated-png') {
    const buffer = await sharp(basePng)
      .rotate(4, { background: '#ffffff' })
      .png()
      .toBuffer();
    return { buffer, extension: 'png' };
  }

  if (variant === 'low-contrast-jpeg') {
    const buffer = await sharp(basePng)
      .modulate({ brightness: 1.12, saturation: 0.05 })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer, extension: 'jpg' };
  }

  const buffer = await sharp(basePng)
    .jpeg({ quality: 35, mozjpeg: true })
    .toBuffer();
  return { buffer, extension: 'jpg' };
}

function renderSyntheticSlipSvg(fixtureCase: OcrSyntheticFixtureCase): string {
  const boxRows = Object.entries(fixtureCase.expected.boxes)
    .map(([key, value], index) => textLine(80, 250 + index * 42, `${formatBoxLabel(key)}: ${formatValue(value)}`, 25))
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1650" viewBox="0 0 1280 1650">
  <rect width="1280" height="1650" fill="#ffffff"/>
  <rect x="42" y="42" width="1196" height="1566" fill="none" stroke="#111827" stroke-width="4"/>
  <rect x="66" y="66" width="1148" height="150" fill="#f9fafb" stroke="#d1d5db" stroke-width="2"/>
  ${textLine(80, 118, 'TaxAgent.ai private OCR synthetic image fixture', 32, 'bold')}
  ${textLine(80, 168, `Slip type: ${fixtureCase.slipType.toUpperCase()}`, 27)}
  ${textLine(80, 212, `Issuer name: ${fixtureCase.expected.issuerName}`, 27)}
  ${textLine(700, 212, `Tax year: ${fixtureCase.expected.taxYear}`, 27)}
  ${boxRows}
  ${textLine(80, 1530, 'Fake data for local OCR benchmarking only.', 24)}
</svg>`;
}

function textLine(
  x: number,
  y: number,
  value: string,
  size: number,
  weight = 'normal',
): string {
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="#111827">${escapeXml(value)}</text>`;
}

function formatBoxLabel(key: string): string {
  if (key.startsWith('box')) {
    return `Box ${key.slice(3)}`;
  }
  return key;
}

function formatValue(value: number | string): string {
  return typeof value === 'number' ? value.toFixed(Number.isInteger(value) ? 0 : 2) : value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  assertPrivateOutput(args.outputRoot);
  const sharp = loadSharp();

  const sourceDir = path.join(args.outputRoot, 'source', 'cra-synthetic-images');
  const expectedDir = path.join(args.outputRoot, 'expected', 'cra-synthetic-images');

  for (const imageCase of OCR_SYNTHETIC_IMAGE_FIXTURE_CASES) {
    const baseCase = getBaseSyntheticFixtureCase(imageCase.baseCaseId);
    const basePng = await renderBasePng(sharp, baseCase);
    const output = await applyImageVariant(sharp, basePng, imageCase.imageVariant);
    const sourcePath = path.join(sourceDir, `${imageCase.id}.${output.extension}`);
    const expectedPath = path.join(expectedDir, `${imageCase.id}.json`);

    writeFile(sourcePath, output.buffer);
    writeFile(expectedPath, `${JSON.stringify(baseCase.expected, null, 2)}\n`);

    console.log(`Generated ${imageCase.id}`);
    console.log(`  source:   ${sourcePath}`);
    console.log(`  expected: ${expectedPath}`);
    console.log('  capture:');
    console.log(`    npm run capture:ocr-fixture -- --file ${sourcePath} --slip-type ${baseCase.slipType} --expected ${expectedPath} --out ${path.join(args.outputRoot, 'captured', 'cra-synthetic-images', `${imageCase.id}.json`)} --id ${imageCase.id}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
