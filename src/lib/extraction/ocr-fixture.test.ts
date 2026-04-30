import { describe, expect, it } from 'vitest';
import {
  buildOcrEvalFixtureFromPipelineResult,
  pipelineResultToOcrEvalActual,
} from './ocr-fixture';
import type { PipelineResult } from './types';

const baseResult: PipelineResult = {
  status: 'needs_review',
  classification: {
    slipType: 't4',
    confidence: 1,
    notes: 'User-selected slip type',
  },
  extraction: null,
  validation: {
    valid: true,
    flags: [
      {
        field: 'box22',
        reason: 'low_confidence',
        message: 'box22 has confidence 60%',
        extractedValue: 9000,
      },
    ],
  },
  boxes: {
    box14: 50000,
    box22: 9000,
  },
  slipType: 'T4',
  issuerName: 'Example Employer Inc.',
  taxYear: 2025,
  summary: 'T4 from Example Employer Inc. (2025).',
  rawModelResponses: {
    classification: null,
    extraction: null,
  },
  usage: {
    classificationInputTokens: 0,
    classificationOutputTokens: 0,
    extractionInputTokens: 100,
    extractionOutputTokens: 25,
  },
};

describe('ocr-fixture helpers', () => {
  it('converts a pipeline result into eval actual shape without raw model responses', () => {
    expect(pipelineResultToOcrEvalActual(baseResult)).toEqual({
      slipType: 'T4',
      issuerName: 'Example Employer Inc.',
      taxYear: 2025,
      boxes: {
        box14: 50000,
        box22: 9000,
      },
      status: 'needs_review',
      flags: [
        {
          field: 'box22',
          reason: 'low_confidence',
          message: 'box22 has confidence 60%',
        },
      ],
    });
  });

  it('builds a complete private fixture from expected values and a pipeline result', () => {
    const fixture = buildOcrEvalFixtureFromPipelineResult({
      id: 'private-t4-001',
      slipType: 't4',
      description: 'Redacted local T4 smoke fixture',
      expected: {
        issuerName: 'Example Employer Inc.',
        taxYear: 2025,
        boxes: {
          box14: 50000,
          box22: 9000,
        },
      },
      result: baseResult,
    });

    expect(fixture.id).toBe('private-t4-001');
    expect(fixture.slipType).toBe('t4');
    expect(fixture.expected.boxes.box14).toBe(50000);
    expect(fixture.actual?.boxes?.box22).toBe(9000);
  });
});
