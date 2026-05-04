/**
 * TaxAgent.ai — Readiness Score Tests
 */

import { describe, it, expect } from 'vitest';
import { computeReadinessScore, countErrorWarnings } from './readiness-score';
import type { TaxFileGraph } from '@/lib/tax-file/types';

/** Helper: build a minimal TaxFileGraph for testing. */
function makeGraph(overrides: Partial<{
  unreviewedExtractionCount: number;
  hasCalculation: boolean;
  hasDeductions: boolean;
  warnings: TaxFileGraph['warnings'];
}>): TaxFileGraph {
  const warnings = overrides.warnings ?? [];
  return {
    profileId: 'test-profile',
    taxYear: 2025,
    status: 'draft',
    profile: {
      profileId: 'test-profile',
      userId: 'test-user',
      taxYear: 2025,
      legalName: 'Test User',
      maritalStatus: 'single',
      residencyStatus: 'citizen',
      assessmentComplete: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    documents: [],
    slips: [],
    corrections: [],
    calculation: null,
    taxReturn: null,
    deductions: null,
    edges: [],
    warnings,
    summary: {
      documentCount: 0,
      slipCount: 0,
      correctionCount: 0,
      warningCount: warnings.length,
      unreviewedExtractionCount: overrides.unreviewedExtractionCount ?? 0,
      hasCalculation: overrides.hasCalculation ?? true,
      hasReturn: false,
      hasDeductions: overrides.hasDeductions ?? true,
    },
    assembledAt: new Date().toISOString(),
  };
}

describe('computeReadinessScore', () => {
  it('returns 100 for a perfect file', () => {
    const graph = makeGraph({ hasCalculation: true, hasDeductions: true });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(100);
    expect(result.deductions.unreviewedExtractions).toBe(0);
    expect(result.deductions.missingSlips).toBe(0);
    expect(result.deductions.noCalculation).toBe(0);
    expect(result.deductions.errorWarnings).toBe(0);
    expect(result.deductions.noDeductions).toBe(0);
  });

  it('deducts 15 per unreviewed extraction', () => {
    const graph = makeGraph({ unreviewedExtractionCount: 2 });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(100 - 30);
    expect(result.deductions.unreviewedExtractions).toBe(30);
  });

  it('deducts 25 for no calculation', () => {
    const graph = makeGraph({ hasCalculation: false });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(100 - 25);
    expect(result.deductions.noCalculation).toBe(25);
  });

  it('deducts 5 for no deductions entered', () => {
    const graph = makeGraph({ hasDeductions: false });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(100 - 5);
    expect(result.deductions.noDeductions).toBe(5);
  });

  it('deducts 10 per missing mentioned slip', () => {
    const graph = makeGraph({
      warnings: [
        { severity: 'info', code: 'MISSING_MENTIONED_SLIP', message: 'T4 missing' },
        { severity: 'info', code: 'MISSING_MENTIONED_SLIP', message: 'T5 missing' },
      ],
    });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(100 - 20);
    expect(result.deductions.missingSlips).toBe(20);
  });

  it('deducts 20 per error-level warning', () => {
    const graph = makeGraph({
      warnings: [
        { severity: 'error', code: 'EXTRACTION_FAILED', message: 'T4 extraction failed' },
        { severity: 'error', code: 'EXTRACTION_FAILED', message: 'T5 extraction failed' },
      ],
    });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(100 - 40);
    expect(result.deductions.errorWarnings).toBe(40);
  });

  it('floors at 0 when penalties exceed 100', () => {
    const graph = makeGraph({
      unreviewedExtractionCount: 5, // -75
      hasCalculation: false,        // -25
      hasDeductions: false,         // -5
      warnings: [
        { severity: 'error', code: 'EXTRACTION_FAILED', message: 'fail' }, // -20
      ],
    });
    const result = computeReadinessScore(graph);
    expect(result.score).toBe(0);
  });

  it('combines multiple penalties correctly', () => {
    const graph = makeGraph({
      unreviewedExtractionCount: 1, // -15
      hasCalculation: false,        // -25
      hasDeductions: false,         // -5
      warnings: [
        { severity: 'info', code: 'MISSING_MENTIONED_SLIP', message: 'T4 missing' }, // -10
        { severity: 'warning', code: 'UNREVIEWED_EXTRACTION', message: 'unreviewed' }, // 0 (not error)
      ],
    });
    const result = computeReadinessScore(graph);
    // 100 - 15 - 25 - 5 - 10 = 45
    expect(result.score).toBe(45);
  });
});

describe('countErrorWarnings', () => {
  it('returns 0 when no error warnings', () => {
    const graph = makeGraph({
      warnings: [
        { severity: 'info', code: 'NO_CALCULATION', message: 'no calc' },
        { severity: 'warning', code: 'UNREVIEWED_EXTRACTION', message: 'unreviewed' },
      ],
    });
    expect(countErrorWarnings(graph)).toBe(0);
  });

  it('counts only error-level warnings', () => {
    const graph = makeGraph({
      warnings: [
        { severity: 'error', code: 'EXTRACTION_FAILED', message: 'fail1' },
        { severity: 'warning', code: 'UNREVIEWED_EXTRACTION', message: 'warn' },
        { severity: 'error', code: 'EXTRACTION_FAILED', message: 'fail2' },
      ],
    });
    expect(countErrorWarnings(graph)).toBe(2);
  });
});
