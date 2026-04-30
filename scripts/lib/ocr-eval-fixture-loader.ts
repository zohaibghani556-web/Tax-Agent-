import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeOcrEvalFixturePayload,
} from '../../src/lib/extraction/ocr-eval';
import type { OcrEvalFixture } from '../../src/lib/extraction/ocr-eval';

export function loadOcrEvalFixtures(targetPath: string): OcrEvalFixture[] {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return readFixtureFile(targetPath);
  }

  return listJsonFilesRecursive(targetPath)
    .flatMap((filePath) => readFixtureFile(filePath));
}

function readFixtureFile(filePath: string): OcrEvalFixture[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  return normalizeOcrEvalFixturePayload(JSON.parse(raw) as unknown);
}

function listJsonFilesRecursive(directoryPath: string): string[] {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsonFilesRecursive(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}
