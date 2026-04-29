import { describe, expect, it } from 'vitest';
import { BLANK_EXTRACTION_MESSAGE, hasBlankExtractionFlag } from './ocr-result';

describe('ocr-result', () => {
  it('detects blank extraction flags defensively', () => {
    expect(hasBlankExtractionFlag(undefined)).toBe(false);
    expect(hasBlankExtractionFlag(null)).toBe(false);
    expect(hasBlankExtractionFlag([{ reason: 'low_confidence' }])).toBe(false);
    expect(hasBlankExtractionFlag([{ reason: 'blank_extraction' }])).toBe(true);
  });

  it('uses one blank extraction message across upload entry points', () => {
    expect(BLANK_EXTRACTION_MESSAGE).toContain('could not read any usable boxes');
  });
});
