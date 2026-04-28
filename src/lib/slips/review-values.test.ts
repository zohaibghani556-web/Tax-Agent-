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
});
