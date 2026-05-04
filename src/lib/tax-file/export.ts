/**
 * TaxAgent.ai — Tax File Graph Export
 *
 * Client-side export of the Tax File Graph to JSON and CSV.
 * Data is already loaded in the browser — no server round-trip needed.
 */

import type { TaxFileGraph } from './types';

// ============================================================
// JSON EXPORT
// ============================================================

export function exportTaxFileJSON(graph: TaxFileGraph): string {
  return JSON.stringify(graph, null, 2);
}

// ============================================================
// CSV EXPORT
// ============================================================

/**
 * Produces a multi-section CSV with slips, calculation lines, and provenance.
 * Sections are separated by a blank line and a header row.
 */
export function exportTaxFileCSV(graph: TaxFileGraph): string {
  const lines: string[] = [];

  // Section 1: Slips
  lines.push('## Slips');
  lines.push('Slip Type,Issuer,Source,Primary Value,Created At');
  for (const slip of graph.slips) {
    const primaryValue = getPrimaryBoxValue(slip.slipType, slip.boxes);
    lines.push(csvRow([
      slip.slipType,
      slip.issuerName,
      slip.source,
      primaryValue,
      slip.createdAt,
    ]));
  }

  lines.push('');

  // Section 2: Calculation Summary
  lines.push('## Calculation Summary');
  if (graph.calculation) {
    lines.push('Field,Amount');
    lines.push(csvRow(['Total Income', fmt(graph.calculation.totalIncome)]));
    lines.push(csvRow(['Net Income', fmt(graph.calculation.netIncome)]));
    lines.push(csvRow(['Taxable Income', fmt(graph.calculation.taxableIncome)]));
    lines.push(csvRow(['Federal Tax', fmt(graph.calculation.netFederalTax)]));
    lines.push(csvRow(['Ontario Tax', fmt(graph.calculation.netOntarioTax)]));
    lines.push(csvRow(['Total Tax Payable', fmt(graph.calculation.totalTaxPayable)]));
    lines.push(csvRow(['Tax Deducted', fmt(graph.calculation.totalTaxDeducted)]));
    lines.push(csvRow(['Balance Owing', fmt(graph.calculation.balanceOwing)]));
  } else {
    lines.push('No calculation available');
  }

  lines.push('');

  // Section 3: Provenance Records
  lines.push('## Provenance Records');
  if (graph.taxReturn && graph.taxReturn.provenanceRecords.length > 0) {
    lines.push('Field ID,Value,Source Type,Rule,Computation');
    for (const prov of graph.taxReturn.provenanceRecords) {
      lines.push(csvRow([
        prov.field_id,
        fmt(prov.value),
        prov.source.type,
        prov.rule_applied?.description ?? '',
        prov.computation ?? '',
      ]));
    }
  } else {
    lines.push('No provenance records available');
  }

  lines.push('');

  // Section 4: Warnings
  lines.push('## Warnings');
  if (graph.warnings.length > 0) {
    lines.push('Severity,Code,Message');
    for (const w of graph.warnings) {
      lines.push(csvRow([w.severity, w.code, w.message]));
    }
  } else {
    lines.push('No warnings');
  }

  return lines.join('\n');
}

// ============================================================
// DOWNLOAD HELPER
// ============================================================

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function csvRow(values: string[]): string {
  return values.map(escapeCsvField).join(',');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Return the most meaningful box value for a slip type (for the CSV summary). */
function getPrimaryBoxValue(slipType: string, boxes: Record<string, number | string>): string {
  const primaryBoxMap: Record<string, string> = {
    T4: 'box14',
    T5: 'box13',
    T5008: 'box21',
    T3: 'box21',
    T4A: 'box016',
    T2202: 'boxA',
    T4E: 'box14',
    T5007: 'box14',
    T4AP: 'box18',
    T4AOAS: 'box18',
    T4RSP: 'box20',
    T4RIF: 'box16',
    'RRSP-Receipt': 'box18',
    T4FHSA: 'box22',
  };
  const key = primaryBoxMap[slipType];
  if (!key) return '';
  const val = boxes[key];
  if (val === undefined || val === null) return '';
  return typeof val === 'number' ? val.toFixed(2) : String(val);
}
