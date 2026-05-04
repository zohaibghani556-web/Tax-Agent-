/**
 * TaxAgent.ai — Tax File Export Tests
 *
 * Tests JSON and CSV export of the Tax File Graph.
 */

import { describe, it, expect } from 'vitest';
import { exportTaxFileJSON, exportTaxFileCSV } from './export';
import type { TaxFileGraph } from './types';

// ─── Test graph factory ─────────────────────────────────────────────────────

function makeTestGraph(overrides: Partial<TaxFileGraph> = {}): TaxFileGraph {
  return {
    profileId: 'profile-1',
    taxYear: 2025,
    status: 'export_ready',
    profile: {
      profileId: 'profile-1',
      userId: 'user-1',
      taxYear: 2025,
      legalName: 'Test User',
      maritalStatus: 'single',
      residencyStatus: 'citizen',
      assessmentComplete: true,
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    documents: [],
    slips: [
      {
        slipId: 'slip-1',
        slipType: 'T4',
        issuerName: 'Acme Corp',
        source: 'ocr',
        boxes: { box14: 50000, box22: 8000 },
        fileHash: 'abc123',
        sourceExtractionId: 'ext-1',
        createdAt: '2026-02-01T00:00:00Z',
      },
      {
        slipId: 'slip-2',
        slipType: 'T5',
        issuerName: 'Bank of Canada',
        source: 'manual',
        boxes: { box13: 1200.50 },
        fileHash: null,
        sourceExtractionId: null,
        createdAt: '2026-02-02T00:00:00Z',
      },
    ],
    corrections: [],
    calculation: {
      calculationId: 'calc-1',
      totalIncome: 51200.50,
      netIncome: 46200.50,
      taxableIncome: 46200.50,
      netFederalTax: 5100,
      netOntarioTax: 3050,
      totalTaxPayable: 8150,
      totalTaxDeducted: 8000,
      balanceOwing: 150,
      calculatedAt: '2026-03-01T00:00:00Z',
      detailedBreakdown: null,
    },
    taxReturn: {
      engineMode: 'slips',
      engineVersion: '1.0.0',
      provenanceRecords: [
        {
          field_id: 'line_10100',
          value: 50000,
          source: { type: 'slip', slip_type: 'T4', slip_index: 0, box: 'box14' },
          rule_applied: { description: 'Employment income', ita_section: 'ITA s.5(1)' },
          computation: '50000',
          timestamp: '2026-03-01T00:00:00Z',
          engine_version: '1.0.0',
        },
      ],
      updatedAt: '2026-03-01T00:00:00Z',
    },
    deductions: null,
    edges: [],
    warnings: [
      {
        severity: 'info',
        code: 'MISSING_MENTIONED_SLIP',
        message: 'T2202 was mentioned but not uploaded',
      },
    ],
    summary: {
      documentCount: 0,
      slipCount: 2,
      correctionCount: 0,
      warningCount: 1,
      unreviewedExtractionCount: 0,
      hasCalculation: true,
      hasReturn: true,
      hasDeductions: false,
    },
    assembledAt: '2026-03-01T12:00:00Z',
    ...overrides,
  };
}

// ─── JSON tests ─────────────────────────────────────────────────────────────

describe('exportTaxFileJSON', () => {
  it('produces valid JSON that round-trips', () => {
    const graph = makeTestGraph();
    const json = exportTaxFileJSON(graph);
    const parsed = JSON.parse(json);
    expect(parsed.profileId).toBe('profile-1');
    expect(parsed.taxYear).toBe(2025);
    expect(parsed.slips).toHaveLength(2);
  });

  it('preserves monetary precision', () => {
    const graph = makeTestGraph();
    const json = exportTaxFileJSON(graph);
    const parsed = JSON.parse(json);
    expect(parsed.calculation.totalIncome).toBe(51200.50);
    expect(parsed.slips[1].boxes.box13).toBe(1200.50);
  });

  it('includes provenance records', () => {
    const graph = makeTestGraph();
    const json = exportTaxFileJSON(graph);
    const parsed = JSON.parse(json);
    expect(parsed.taxReturn.provenanceRecords).toHaveLength(1);
    expect(parsed.taxReturn.provenanceRecords[0].field_id).toBe('line_10100');
  });
});

// ─── CSV tests ──────────────────────────────────────────────────────────────

describe('exportTaxFileCSV', () => {
  it('includes slip section with correct headers', () => {
    const graph = makeTestGraph();
    const csv = exportTaxFileCSV(graph);
    expect(csv).toContain('## Slips');
    expect(csv).toContain('Slip Type,Issuer,Source,Primary Value,Created At');
    expect(csv).toContain('T4,Acme Corp,ocr,50000.00');
  });

  it('includes calculation summary', () => {
    const graph = makeTestGraph();
    const csv = exportTaxFileCSV(graph);
    expect(csv).toContain('## Calculation Summary');
    expect(csv).toContain('Total Income,51200.50');
    expect(csv).toContain('Balance Owing,150.00');
  });

  it('includes provenance records', () => {
    const graph = makeTestGraph();
    const csv = exportTaxFileCSV(graph);
    expect(csv).toContain('## Provenance Records');
    expect(csv).toContain('line_10100,50000.00,slip,Employment income');
  });

  it('includes warnings section', () => {
    const graph = makeTestGraph();
    const csv = exportTaxFileCSV(graph);
    expect(csv).toContain('## Warnings');
    expect(csv).toContain('info,MISSING_MENTIONED_SLIP');
  });

  it('handles empty calculation gracefully', () => {
    const graph = makeTestGraph({ calculation: null });
    const csv = exportTaxFileCSV(graph);
    expect(csv).toContain('No calculation available');
  });

  it('handles empty provenance gracefully', () => {
    const graph = makeTestGraph({ taxReturn: null });
    const csv = exportTaxFileCSV(graph);
    expect(csv).toContain('No provenance records available');
  });

  it('escapes commas in issuer names', () => {
    const graph = makeTestGraph({
      slips: [
        {
          slipId: 'slip-3',
          slipType: 'T4',
          issuerName: 'Smith, Johnson & Co',
          source: 'manual',
          boxes: { box14: 30000 },
          fileHash: null,
          sourceExtractionId: null,
          createdAt: '2026-02-01T00:00:00Z',
        },
      ],
    });
    const csv = exportTaxFileCSV(graph);
    // Issuer with comma should be quoted
    expect(csv).toContain('"Smith, Johnson & Co"');
  });
});
