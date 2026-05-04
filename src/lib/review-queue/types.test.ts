/**
 * TaxAgent.ai — Review Queue Types Tests
 *
 * Tests for status transition validation logic.
 */

import { describe, it, expect } from 'vitest';
import { isValidTransition, VALID_TRANSITIONS } from './types';
import type { ReviewFileStatus } from './types';

describe('isValidTransition', () => {
  it('allows in_prep → in_review', () => {
    expect(isValidTransition('in_prep', 'in_review')).toBe(true);
  });

  it('allows in_review → approved', () => {
    expect(isValidTransition('in_review', 'approved')).toBe(true);
  });

  it('allows in_review → needs_info', () => {
    expect(isValidTransition('in_review', 'needs_info')).toBe(true);
  });

  it('allows needs_info → in_prep', () => {
    expect(isValidTransition('needs_info', 'in_prep')).toBe(true);
  });

  it('allows approved → filed', () => {
    expect(isValidTransition('approved', 'filed')).toBe(true);
  });

  it('disallows in_prep → approved (must go through in_review)', () => {
    expect(isValidTransition('in_prep', 'approved')).toBe(false);
  });

  it('disallows approved → in_review (no backward from approved)', () => {
    expect(isValidTransition('approved', 'in_review')).toBe(false);
  });

  it('disallows filed → anything (terminal state)', () => {
    const allStatuses: ReviewFileStatus[] = ['in_prep', 'in_review', 'approved', 'filed', 'needs_info'];
    for (const target of allStatuses) {
      expect(isValidTransition('filed', target)).toBe(false);
    }
  });

  it('disallows in_prep → needs_info (only reviewer can send to needs_info)', () => {
    expect(isValidTransition('in_prep', 'needs_info')).toBe(false);
  });

  it('disallows needs_info → in_review (must go back to in_prep first)', () => {
    expect(isValidTransition('needs_info', 'in_review')).toBe(false);
  });
});

describe('VALID_TRANSITIONS completeness', () => {
  it('every ReviewFileStatus has an entry', () => {
    const allStatuses: ReviewFileStatus[] = ['in_prep', 'in_review', 'approved', 'filed', 'needs_info'];
    for (const status of allStatuses) {
      expect(VALID_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
    }
  });
});
