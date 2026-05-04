import { describe, expect, it } from 'vitest';
import {
  buildReviewFieldValues,
  getIssuerFieldKey,
  hasReviewValueChanged,
  sanitizeReviewFieldValues,
  validateReviewFieldValues,
} from './review-values';

describe('review-values', () => {
  it('uses issuerName for most slips and institutionName for T2202', () => {
    expect(getIssuerFieldKey('T4')).toBe('issuerName');
    expect(getIssuerFieldKey('T2202')).toBe('institutionName');
  });

  it('injects OCR issuer metadata into the T4 review values', () => {
    const values = buildReviewFieldValues('T4', { box14: 50000 }, 'Employer Inc.');

    expect(values).toEqual({
      issuerName: 'Employer Inc.',
      box14: 50000,
    });
  });

  it('injects OCR issuer metadata into T2202 institutionName', () => {
    const values = buildReviewFieldValues('T2202', { boxA: 14625.25 }, 'University');

    expect(values).toEqual({
      institutionName: 'University',
      boxA: 14625.25,
    });
  });

  it('does not turn missing numeric OCR fields into zero', () => {
    const values = buildReviewFieldValues('T4', {}, 'Employer Inc.');

    expect(values).toEqual({ issuerName: 'Employer Inc.' });
    expect(values.box14).toBeUndefined();
  });

  it('flags required fields that OCR omitted', () => {
    const issues = validateReviewFieldValues('T4', { issuerName: 'Employer Inc.' });

    expect(issues.map((issue) => issue.field)).toContain('box14');
  });

  it('keeps explicit numeric zero as a valid value', () => {
    const issues = validateReviewFieldValues('T4', {
      issuerName: 'Employer Inc.',
      box14: 0,
    });

    expect(issues).toEqual([]);
  });

  it('removes blank optional fields before saving', () => {
    const sanitized = sanitizeReviewFieldValues('T4', {
      issuerName: 'Employer Inc.',
      box14: 50000,
      box22: '',
      box16: 0,
    });

    expect(sanitized).toEqual({
      issuerName: 'Employer Inc.',
      box14: 50000,
      box16: 0,
    });
  });

  it('treats undefined and blank as unchanged but catches filled missing fields', () => {
    expect(hasReviewValueChanged(undefined, '')).toBe(false);
    expect(hasReviewValueChanged(undefined, 50000)).toBe(true);
    expect(hasReviewValueChanged(50000, 51000)).toBe(true);
  });

  describe('numeric range validation', () => {
    it('rejects negative monetary values', () => {
      const issues = validateReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: -5000,
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].field).toBe('box14');
      expect(issues[0].message).toContain('cannot be negative');
    });

    it('rejects values exceeding $10M', () => {
      const issues = validateReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: 15_000_000,
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].field).toBe('box14');
      expect(issues[0].message).toContain('exceeds the maximum');
    });

    it('accepts zero as a valid value (not negative)', () => {
      const issues = validateReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: 0,
      });

      expect(issues).toEqual([]);
    });

    it('accepts values at the boundary ($10M)', () => {
      const issues = validateReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: 10_000_000,
      });

      expect(issues).toEqual([]);
    });

    it('sanitize strips negative values', () => {
      const sanitized = sanitizeReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: 50000,
        box22: -100,
      });

      expect(sanitized.box14).toBe(50000);
      expect(sanitized.box22).toBeUndefined();
    });

    it('sanitize strips values exceeding max', () => {
      const sanitized = sanitizeReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: 999_999_999,
      });

      expect(sanitized.box14).toBeUndefined();
      expect(sanitized.issuerName).toBe('Employer Inc.');
    });

    it('sanitize coerces string numbers to numeric', () => {
      const sanitized = sanitizeReviewFieldValues('T4', {
        issuerName: 'Employer Inc.',
        box14: '50000' as unknown as number,
      });

      expect(sanitized.box14).toBe(50000);
    });
  });

  describe('blank extraction rejection', () => {
    it('flags all required fields when boxes are completely empty', () => {
      const issues = validateReviewFieldValues('T4', {});

      const fieldNames = issues.map((i) => i.field);
      expect(fieldNames).toContain('issuerName');
      expect(fieldNames).toContain('box14');
    });

    it('flags T5008 missing required box21', () => {
      const issues = validateReviewFieldValues('T5008', {
        issuerName: 'TD Waterhouse',
      });

      expect(issues.map((i) => i.field)).toContain('box21');
    });

    it('flags T2202 missing required institutionName and boxA', () => {
      const issues = validateReviewFieldValues('T2202', {});

      const fieldNames = issues.map((i) => i.field);
      expect(fieldNames).toContain('institutionName');
      expect(fieldNames).toContain('boxA');
    });

    it('passes when all required fields are present', () => {
      const issues = validateReviewFieldValues('T5008', {
        issuerName: 'TD Waterhouse',
        box21: 15000,
      });

      expect(issues).toEqual([]);
    });
  });
});
