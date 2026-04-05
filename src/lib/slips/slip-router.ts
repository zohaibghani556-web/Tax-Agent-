/**
 * Slip type routing — infers the CRA slip type from OCR-extracted text.
 * Used to cross-validate Claude's slip type determination.
 */

import type { TaxSlip } from '../tax-engine/types';

export type SlipTypeCode = TaxSlip['type'] | 'unknown';

// Phrase patterns that definitively identify each CRA slip type.
// Ordered from most-specific to least-specific to avoid false positives.
const SLIP_PATTERNS: Array<{ type: SlipTypeCode; patterns: RegExp[] }> = [
  {
    // T4A must come before T4 to prevent "T4A" from matching T4's regex
    type: 'T4A',
    patterns: [
      /t-?4a\s+statement\s+of\s+pension/i,
      /statement\s+of\s+pension.*retirement.*annuity/i,
      /statement\s+of\s+pension.*annuity.*other\s+income/i,
    ],
  },
  {
    type: 'T4E',
    patterns: [
      /t-?4e\b/i,
      /statement\s+of\s+employment\s+insurance\s+and\s+other\s+benefits/i,
    ],
  },
  {
    type: 'T4',
    patterns: [
      /t-?4\s+statement\s+of\s+remuneration/i,
      /statement\s+of\s+remuneration\s+paid/i,
      /relevé\s+d.emploi/i,
    ],
  },
  {
    type: 'T5008',
    patterns: [
      /t-?5008/i,
      /statement\s+of\s+securities\s+transactions/i,
    ],
  },
  {
    type: 'T5007',
    patterns: [
      /t-?5007/i,
      /statement\s+of\s+benefits/i,
    ],
  },
  {
    type: 'T5',
    patterns: [
      /t-?5\s+statement\s+of\s+investment\s+income/i,
      /statement\s+of\s+investment\s+income/i,
    ],
  },
  {
    type: 'T3',
    patterns: [
      /t-?3\s+statement\s+of\s+trust\s+income/i,
      /statement\s+of\s+trust\s+income\s+allocations/i,
    ],
  },
  {
    type: 'T2202',
    patterns: [
      /t-?2202/i,
      /tuition\s+and\s+en[r]?ol[l]?ment\s+certificate/i,
    ],
  },
];

export function routeSlipType(ocrText: string): SlipTypeCode {
  for (const { type, patterns } of SLIP_PATTERNS) {
    if (patterns.some((re) => re.test(ocrText))) {
      return type;
    }
  }
  return 'unknown';
}
