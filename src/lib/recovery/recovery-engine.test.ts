/**
 * Tests for the retroactive recovery engine.
 *
 * Each scenario uses a synthetic ParsedNOA. We verify:
 *   - Which opportunities are surfaced (type + lineNumber)
 *   - The estimated dollar amounts
 *   - T1-ADJ flag accuracy
 *   - Confidence levels
 */

import { describe, it, expect } from 'vitest';
import { analyzeReturn, totalRecoverable, type RecoveryOpportunity } from './recovery-engine';
import type { ParsedNOA } from './noa-parser';

// ── Helper: minimal valid NOA with no recoverable amounts ─────────────────────

function baseNOA(overrides: Partial<ParsedNOA> = {}): ParsedNOA {
  return {
    taxYear:           2023,
    taxpayerName:      'Test Taxpayer',
    line10100:          -1,   // not present
    line11300:          -1,
    line11400:          -1,
    line11500:          -1,
    line13000:          -1,
    line15000:          50000,
    line20800:          -1,
    line23600:          50000,
    line26000:          33871,
    line42000:          5000,
    line43500:          5000,
    line44000:          0,
    line30100:          -1,
    line33099:          -1,
    line45300:          -1,
    line47600:          -1,
    rrspRoomNextYear:   -1,
    tuitionCarryforward: -1,
    confidence:         0.9,
    lowConfidenceFields: [],
    ...overrides,
  };
}

// ── CWB Tests ─────────────────────────────────────────────────────────────────

describe('CWB recovery', () => {
  it('flags missed CWB for single low-income worker (2023)', () => {
    const noa = baseNOA({
      line10100: 18000,   // working income
      line23600: 18000,   // net income — well below single clawback start $22,944
      line45300: -1,      // not claimed
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');

    expect(cwb).toBeDefined();
    // 2023 single max = $1,428; net income below clawStart → full amount
    expect(cwb!.estimatedAmount).toBe(1428);
    expect(cwb!.t1AdjRequired).toBe(true);
    expect(cwb!.confidence).toBe('high');  // line45300 was -1 (absent from NOA)
  });

  it('flags partial missed CWB when income is in phase-out range (2023)', () => {
    const noa = baseNOA({
      line10100: 25000,
      line23600: 25000,   // above clawback start $22,944 → partial benefit
      line45300: -1,
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');

    expect(cwb).toBeDefined();
    // Reduction = (25000 - 22944) × 15% = 2056 × 0.15 = 308.40 → rounded = 308.40
    // Eligible = 1428 - 308.40 = 1119.60
    expect(cwb!.estimatedAmount).toBeGreaterThan(0);
    expect(cwb!.estimatedAmount).toBeLessThan(1428);
  });

  it('flags full missed CWB for family (2023)', () => {
    const noa = baseNOA({
      line10100: 20000,
      line23600: 20000,
      line45300: -1,
    });
    const ops = analyzeReturn(noa, { hasSpouseOrDependant: true });
    const cwb = ops.find((o) => o.lineNumber === '45300');

    expect(cwb).toBeDefined();
    // 2023 family max = $2,461; income < family claw start $26,177
    expect(cwb!.estimatedAmount).toBe(2461);
  });

  it('does NOT flag CWB when income exceeds phase-out (2023)', () => {
    const noa = baseNOA({
      line10100: 40000,
      line23600: 40000,   // single phase-out ≈ ($1,428 / 0.15) + $22,944 = $32,464
      line45300: -1,
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');
    expect(cwb).toBeUndefined();
  });

  it('does NOT flag CWB when working income is below $3,000', () => {
    const noa = baseNOA({
      line10100: 2000,
      line23600: 2000,
      line45300: -1,
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');
    expect(cwb).toBeUndefined();
  });

  it('does NOT flag CWB when NOA shows it was already claimed', () => {
    const noa = baseNOA({
      line10100: 18000,
      line23600: 18000,
      line45300: 1428,  // already claimed the full amount
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');
    expect(cwb).toBeUndefined();
  });

  it('flags CWB correctly for 2022 year', () => {
    const noa = baseNOA({
      taxYear:   2022,
      line10100: 15000,
      line23600: 15000,
      line45300: -1,
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');
    expect(cwb).toBeDefined();
    // 2022 single max = $1,395
    expect(cwb!.estimatedAmount).toBe(1395);
  });

  it('flags CWB for 2024 year', () => {
    const noa = baseNOA({
      taxYear:   2024,
      line10100: 16000,
      line23600: 16000,
      line45300: -1,
    });
    const ops = analyzeReturn(noa);
    const cwb = ops.find((o) => o.lineNumber === '45300');
    expect(cwb).toBeDefined();
    // 2024 single max = $1,518
    expect(cwb!.estimatedAmount).toBe(1518);
  });
});

// ── Age Amount Tests ─────────────────────────────────────────────────────────

describe('Age Amount recovery', () => {
  it('flags missed age amount for confirmed 65+ taxpayer (2023)', () => {
    const noa = baseNOA({
      line23600: 35000,   // below 2023 clawback start $42,335 → full credit
      line30100: -1,      // not claimed
    });
    const ops = analyzeReturn(noa, { ageOnDec31: 68 });
    const age = ops.find((o) => o.lineNumber === '30100');

    expect(age).toBeDefined();
    // 2023 max $8,396 × 15% = $1,259.40
    expect(age!.estimatedAmount).toBeCloseTo(1259.40, 0);
    expect(age!.t1AdjRequired).toBe(true);
    expect(age!.confidence).toBe('high');
  });

  it('calculates partial age amount when income partially claws back (2023)', () => {
    const noa = baseNOA({
      line23600: 45000,   // above 2023 clawback start $42,335
      line30100: -1,
    });
    const ops = analyzeReturn(noa, { ageOnDec31: 72 });
    const age = ops.find((o) => o.lineNumber === '30100');

    expect(age).toBeDefined();
    // Reduction = (45000 - 42335) × 0.15 = 399.75
    // Eligible amount = 8396 - 399.75 = 7996.25 → credit = 7996.25 × 0.15 = 1199.44
    expect(age!.estimatedAmount).toBeGreaterThan(0);
    expect(age!.estimatedAmount).toBeLessThan(1260);
  });

  it('does NOT flag age amount when taxpayer was under 65', () => {
    const noa = baseNOA({ line30100: -1, line23600: 35000 });
    const ops = analyzeReturn(noa, { ageOnDec31: 60 });
    const age = ops.find((o) => o.lineNumber === '30100');
    expect(age).toBeUndefined();
  });

  it('flags low-confidence age amount when age is unknown', () => {
    const noa = baseNOA({
      line23600: 38000,
      line30100: -1,
    });
    const ops = analyzeReturn(noa);  // no ageOnDec31 provided
    const age = ops.find((o) => o.lineNumber === '30100');

    // Should still flag but at low confidence
    expect(age).toBeDefined();
    expect(age!.confidence).toBe('low');
  });
});

// ── Tuition Carryforward Tests ────────────────────────────────────────────────

describe('Tuition carryforward', () => {
  it('flags tuition carryforward with credit value', () => {
    const noa = baseNOA({ tuitionCarryforward: 8000 });
    const ops = analyzeReturn(noa);
    const tuition = ops.find((o) => o.lineNumber === '32300');

    expect(tuition).toBeDefined();
    // Credit = $8,000 × 15% = $1,200
    expect(tuition!.estimatedAmount).toBeCloseTo(1200, 0);
    expect(tuition!.t1AdjRequired).toBe(false);  // use on next return
    expect(tuition!.confidence).toBe('high');
  });

  it('does NOT flag tuition carryforward when none exists', () => {
    const noa = baseNOA({ tuitionCarryforward: -1 });
    const ops = analyzeReturn(noa);
    const tuition = ops.find((o) => o.lineNumber === '32300');
    expect(tuition).toBeUndefined();
  });
});

// ── RRSP Room Tests ───────────────────────────────────────────────────────────

describe('RRSP room notice', () => {
  it('surfaces RRSP planning opportunity when room exceeds $5,000', () => {
    const noa = baseNOA({ rrspRoomNextYear: 20000 });
    const ops = analyzeReturn(noa);
    const rrsp = ops.find((o) => o.lineNumber === '20800');

    expect(rrsp).toBeDefined();
    // Estimated savings = $20,000 × 26% = $5,200
    expect(rrsp!.estimatedAmount).toBe(5200);
    expect(rrsp!.t1AdjRequired).toBe(false);
  });

  it('does NOT flag RRSP room below $5,000', () => {
    const noa = baseNOA({ rrspRoomNextYear: 3000 });
    const ops = analyzeReturn(noa);
    const rrsp = ops.find((o) => o.lineNumber === '20800');
    expect(rrsp).toBeUndefined();
  });
});

// ── totalRecoverable Tests ────────────────────────────────────────────────────

describe('totalRecoverable', () => {
  it('sums only t1AdjRequired opportunities', () => {
    const ops: RecoveryOpportunity[] = [
      {
        description: 'CWB',
        lineNumber: '45300',
        estimatedAmount: 1428,
        instructions: '',
        t1AdjRequired: true,
        confidence: 'high',
      },
      {
        description: 'RRSP room',
        lineNumber: '20800',
        estimatedAmount: 5000,
        instructions: '',
        t1AdjRequired: false,  // planning, not T1-ADJ
        confidence: 'medium',
      },
    ];
    expect(totalRecoverable(ops)).toBe(1428);
  });

  it('returns 0 when no T1-ADJ opportunities', () => {
    const ops: RecoveryOpportunity[] = [
      {
        description: 'RRSP',
        lineNumber: '20800',
        estimatedAmount: 3000,
        instructions: '',
        t1AdjRequired: false,
        confidence: 'medium',
      },
    ];
    expect(totalRecoverable(ops)).toBe(0);
  });

  it('returns 0 for empty opportunities', () => {
    expect(totalRecoverable([])).toBe(0);
  });
});

// ── Ordering Tests ────────────────────────────────────────────────────────────

describe('result ordering', () => {
  it('returns opportunities sorted by estimated amount descending', () => {
    // High CWB + low tuition carryforward
    const noa = baseNOA({
      line10100: 20000,
      line23600: 20000,
      line45300: -1,            // CWB ~$1,428
      tuitionCarryforward: 500, // credit $75
    });
    const ops = analyzeReturn(noa);
    const amounts = ops.map((o) => o.estimatedAmount);

    // Sorted descending
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeLessThanOrEqual(amounts[i - 1]);
    }
  });
});
