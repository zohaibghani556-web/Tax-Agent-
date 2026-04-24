/**
 * Sanity-check tests for generated CRA XSD slip types.
 *
 * These tests verify that:
 *  - Specified CRA box numbers are present in the generated TypeScript interfaces
 *  - Critical fields (box105, box12 SIN, T2202 months) are accessible
 *  - The XSD_BOX_MAP correctly maps field names → app box keys
 *
 * If these tests fail, re-run `npm run gen:slip-types` and check the XSD source.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  XSD_BOX_MAP_T4,
  XSD_BOX_MAP_T4A,
  XSD_BOX_MAP_T5,
  XSD_BOX_MAP_T5008,
  XSD_BOX_MAP_T3,
  XSD_BOX_MAP_T2202,
  XSD_BOX_MAP,
} from '../src/types/slips/cra/box-mappings';

// ─── Helper: read a generated source file ────────────────────────────────────

const CRA_DIR = path.resolve(__dirname, '../src/types/slips/cra');

function readGenerated(filename: string): string {
  return fs.readFileSync(path.join(CRA_DIR, filename), 'utf8');
}

// ─── T4: verify boxes 14, 16, 18, 22, 24, 26, 12 (SIN) ──────────────────────

describe('Generated T4 types', () => {
  const src = readGenerated('t4.ts');

  it('has Box 14 — employment income field (empt_incamt)', () => {
    expect(src).toContain('empt_incamt');
    expect(src).toContain('Box 14');
  });

  it('has Box 16 — employee CPP contributions (cpp_cntrb_amt)', () => {
    expect(src).toContain('cpp_cntrb_amt');
    expect(src).toContain('Box 16');
  });

  it('has Box 16A — CPP2 contributions (cppe_cntrb_amt)', () => {
    expect(src).toContain('cppe_cntrb_amt');
    expect(src).toContain('Box 16A');
  });

  it('has Box 18 — EI premiums (empe_eip_amt)', () => {
    expect(src).toContain('empe_eip_amt');
    expect(src).toContain('Box 18');
  });

  it('has Box 22 — income tax deducted (itx_ddct_amt)', () => {
    expect(src).toContain('itx_ddct_amt');
    expect(src).toContain('Box 22');
  });

  it('has Box 24 — EI insurable earnings (ei_insu_ern_amt)', () => {
    expect(src).toContain('ei_insu_ern_amt');
    expect(src).toContain('Box 24');
  });

  it('has Box 26 — CPP/QPP pensionable earnings (cpp_qpp_ern_amt)', () => {
    expect(src).toContain('cpp_qpp_ern_amt');
    expect(src).toContain('Box 26');
  });

  it('has SIN field (Box 12)', () => {
    expect(src).toContain('sin: string');
    expect(src).toContain('Box 12');
  });

  it('has CraXsd_T4AmtType interface', () => {
    expect(src).toContain('export interface CraXsd_T4AmtType');
  });

  it('has CraXsd_T4AmtTypeSchema Zod export', () => {
    expect(src).toContain('export const CraXsd_T4AmtTypeSchema');
  });

  it('has OtherInfo section with all fields optional', () => {
    expect(src).toContain('export interface CraXsd_OtherInformationType');
    // All OtherInfo fields must be optional (choice group)
    const otherInfoBlock = src.slice(src.indexOf('CraXsd_OtherInformationType'));
    const firstClosingBrace = otherInfoBlock.indexOf('\n}');
    const block = otherInfoBlock.slice(0, firstClosingBrace);
    // Every declared field line must use ?:
    const fieldLines = block.split('\n').filter(l => /^\s+\w/.test(l) && !l.trim().startsWith('/**'));
    expect(fieldLines.length).toBeGreaterThan(0);
    fieldLines.forEach(line => {
      expect(line, `Expected optional field: ${line.trim()}`).toMatch(/\?:/);
    });
  });

  it('does not reference undefined external type schemas', () => {
    // Should not contain references to undefined schemas like CraXsd_NameTypeSchema
    expect(src).not.toContain('CraXsd_NameTypeSchema');
    expect(src).not.toContain('CraXsd_CanadaAddressTypeSchema');
  });
});

// ─── T4A: verify box105 and box-map access ───────────────────────────────────

describe('Generated T4A types', () => {
  const src = readGenerated('t4a.ts');

  it('has Box 105 — scholarships/bursaries field (brsy_amt)', () => {
    expect(src).toContain('brsy_amt');
    expect(src).toContain('Box 105');
  });

  it('has brsy_amt in the Zod schema', () => {
    expect(src).toContain('brsy_amt: z.number().optional()');
  });

  it('has Box 016 — pension income (pens_spran_amt)', () => {
    expect(src).toContain('pens_spran_amt');
    expect(src).toContain('Box 016');
  });

  it('has Box 022 — income tax deducted (itx_ddct_amt)', () => {
    expect(src).toContain('itx_ddct_amt');
    expect(src).toContain('Box 022');
  });

  it('has Box 105 ITA s.56(3) annotation', () => {
    // Critical for scholarship exemption — must call out the ITA section
    expect(src).toContain('56(3)');
  });

  it('does not reference undefined external type schemas', () => {
    expect(src).not.toContain('CraXsd_NameTypeSchema');
    expect(src).not.toContain('CraXsd_Line2TypeSchema');
  });
});

// ─── T2202: verify months full-time, part-time, tuition ──────────────────────

describe('Generated T2202 types', () => {
  const src = readGenerated('t2202.ts');

  it('has TotalFullTimeStudentMonthCount (Box C)', () => {
    expect(src).toContain('TotalFullTimeStudentMonthCount');
    expect(src).toContain('Box C');
  });

  it('has TotalPartTimeStudentMonthCount (Box B)', () => {
    expect(src).toContain('TotalPartTimeStudentMonthCount');
    expect(src).toContain('Box B');
  });

  it('has TotalEligibleTuitionFeeAmount (Box A)', () => {
    expect(src).toContain('TotalEligibleTuitionFeeAmount');
    expect(src).toContain('Box A');
  });

  it('has SchoolSession nested type', () => {
    expect(src).toContain('CraXsd_SchoolSessionType');
  });

  it('month count fields use ZeroToTwelveCountType → z.number().int().min(0).max(12)', () => {
    expect(src).toContain('z.number().int().min(0).max(12)');
  });

  it('has session start/end year-month fields', () => {
    expect(src).toContain('StartYearMonth');
    expect(src).toContain('EndYearMonth');
  });
});

// ─── XSD_BOX_MAP: verify critical field → box key mappings ───────────────────

describe('XSD_BOX_MAP_T4', () => {
  it('maps empt_incamt → box14', () => {
    expect(XSD_BOX_MAP_T4['empt_incamt']).toBe('box14');
  });
  it('maps cpp_cntrb_amt → box16', () => {
    expect(XSD_BOX_MAP_T4['cpp_cntrb_amt']).toBe('box16');
  });
  it('maps empe_eip_amt → box18', () => {
    expect(XSD_BOX_MAP_T4['empe_eip_amt']).toBe('box18');
  });
  it('maps itx_ddct_amt → box22', () => {
    expect(XSD_BOX_MAP_T4['itx_ddct_amt']).toBe('box22');
  });
  it('maps ei_insu_ern_amt → box24', () => {
    expect(XSD_BOX_MAP_T4['ei_insu_ern_amt']).toBe('box24');
  });
  it('maps cpp_qpp_ern_amt → box26', () => {
    expect(XSD_BOX_MAP_T4['cpp_qpp_ern_amt']).toBe('box26');
  });
  it('maps sin → box12', () => {
    expect(XSD_BOX_MAP_T4['sin']).toBe('box12');
  });
});

describe('XSD_BOX_MAP_T4A — Box 105 (critical for s.56(3) exemption)', () => {
  it('maps brsy_amt → box105', () => {
    expect(XSD_BOX_MAP_T4A['brsy_amt']).toBe('box105');
  });

  it('is accessible via unified XSD_BOX_MAP["T4A"]["brsy_amt"]', () => {
    // This is the access pattern the OCR route will use in Session 12
    expect(XSD_BOX_MAP['T4A']['brsy_amt']).toBe('box105');
  });

  it('maps pens_spran_amt → box016', () => {
    expect(XSD_BOX_MAP_T4A['pens_spran_amt']).toBe('box016');
  });

  it('maps itx_ddct_amt → box022', () => {
    expect(XSD_BOX_MAP_T4A['itx_ddct_amt']).toBe('box022');
  });
});

describe('XSD_BOX_MAP_T5', () => {
  it('maps actl_elg_dvamt → box24', () => {
    expect(XSD_BOX_MAP_T5['actl_elg_dvamt']).toBe('box24');
  });
  it('maps cdn_int_amt → box13', () => {
    expect(XSD_BOX_MAP_T5['cdn_int_amt']).toBe('box13');
  });
});

describe('XSD_BOX_MAP_T3', () => {
  it('maps cgamt → box21 (total capital gains)', () => {
    expect(XSD_BOX_MAP_T3['cgamt']).toBe('box21');
  });
  it('maps prd_2_cgamt → box21A (Period 2 — pre-June 2024)', () => {
    expect(XSD_BOX_MAP_T3['prd_2_cgamt']).toBe('box21A');
  });
  it('maps prd_3_cgamt → box21B (Period 3 — post-June 2024)', () => {
    expect(XSD_BOX_MAP_T3['prd_3_cgamt']).toBe('box21B');
  });
});

describe('XSD_BOX_MAP_T2202', () => {
  it('maps TotalEligibleTuitionFeeAmount → boxA', () => {
    expect(XSD_BOX_MAP_T2202['TotalEligibleTuitionFeeAmount']).toBe('boxA');
  });
  it('maps TotalPartTimeStudentMonthCount → boxB', () => {
    expect(XSD_BOX_MAP_T2202['TotalPartTimeStudentMonthCount']).toBe('boxB');
  });
  it('maps TotalFullTimeStudentMonthCount → boxC', () => {
    expect(XSD_BOX_MAP_T2202['TotalFullTimeStudentMonthCount']).toBe('boxC');
  });
});

describe('XSD_BOX_MAP unified lookup', () => {
  it('has entries for all 6 v1 slip types', () => {
    expect(XSD_BOX_MAP).toHaveProperty('T4');
    expect(XSD_BOX_MAP).toHaveProperty('T4A');
    expect(XSD_BOX_MAP).toHaveProperty('T5');
    expect(XSD_BOX_MAP).toHaveProperty('T5008');
    expect(XSD_BOX_MAP).toHaveProperty('T3');
    expect(XSD_BOX_MAP).toHaveProperty('T2202');
  });
});
