import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  OCR_ENGINE_RESEARCH_SOURCES,
  OCR_SLIP_SOURCES,
  PUBLIC_DOCUMENT_DATASET_SOURCES,
  getOcrSlipSource,
} from './ocr-source-manifest';
import type { ExtractableSlipType } from './types';

const SUPPORTED_EXTRACTABLE_SLIPS: ExtractableSlipType[] = [
  't4',
  't4a',
  't5',
  't3',
  't2202',
  't5008',
  't4e',
  't5007',
  't4ap',
  't4aoas',
  't4rsp',
  't4rif',
  'rrsp_receipt',
  't4fhsa',
];

describe('ocr-source-manifest', () => {
  it('documents a visual and schema source strategy for every extractable slip', () => {
    expect(OCR_SLIP_SOURCES.map((source) => source.slipType).sort()).toEqual(
      [...SUPPORTED_EXTRACTABLE_SLIPS].sort(),
    );

    for (const slipType of SUPPORTED_EXTRACTABLE_SLIPS) {
      const source = getOcrSlipSource(slipType);
      expect(source.engineType.length).toBeGreaterThan(0);
      expect(source.formUrl || source.infoUrl).toBeTruthy();
      expect(source.xsdFiles.length).toBeGreaterThan(0);
      expect(source.notes.length).toBeGreaterThan(0);
    }
  });

  it('points to committed CRA XSD files when XSD validation is planned', () => {
    for (const source of OCR_SLIP_SOURCES) {
      for (const xsdFile of source.xsdFiles) {
        expect(
          fs.existsSync(path.resolve(process.cwd(), xsdFile)),
          `${source.slipType} references missing XSD ${xsdFile}`,
        ).toBe(true);
      }
    }
  });

  it('tracks candidate OCR engines and public benchmark datasets', () => {
    expect(OCR_ENGINE_RESEARCH_SOURCES.length).toBeGreaterThanOrEqual(10);
    expect(PUBLIC_DOCUMENT_DATASET_SOURCES.length).toBeGreaterThanOrEqual(5);
  });
});
