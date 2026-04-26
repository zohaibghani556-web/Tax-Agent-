/**
 * TaxAgent.ai — T2202 box validation (ITA s.118.5).
 *
 * T2202 Tuition and Enrolment Certificate has three key boxes:
 *   Box A — Eligible Tuition Fees: any non-negative dollar amount.
 *   Box B — Part-Time Months Enrolled: integer 0–12 only.
 *   Box C — Full-Time Months Enrolled: integer 0–12 only.
 *
 * A common OCR and manual-entry error is to enter the tuition fee
 * dollar amount into Box C instead of Box A. This module detects
 * that pattern and returns a specific user-facing warning so the
 * user corrects the entry before it corrupts the tax calculation.
 *
 * Pure functions — no side effects, easily unit-testable.
 */

export interface T2202ValidationResult {
  /** Field-keyed error messages to merge into the form error state. */
  errors: Record<string, string>;
  /**
   * True when boxC > 12 AND boxA === 0.
   * Indicates the user (or OCR) likely entered tuition in the wrong box.
   */
  likelyTuitionInWrongBox: boolean;
}

/**
 * Validate T2202 Box B and Box C against the allowed month range (0–12).
 *
 * @param boxA - Eligible tuition fees from Box A (used to detect the
 *               wrong-box pattern when boxC > 12 and boxA is 0).
 * @param boxB - Part-time months from Box B.
 * @param boxC - Full-time months from Box C.
 */
export function validateT2202Boxes(
  boxA: number | string | undefined,
  boxB: number | string | undefined,
  boxC: number | string | undefined,
): T2202ValidationResult {
  const errors: Record<string, string> = {};
  let likelyTuitionInWrongBox = false;

  const numA = typeof boxA === 'number' ? boxA : 0;
  const numB = typeof boxB === 'number' ? boxB : 0;
  const numC = typeof boxC === 'number' ? boxC : 0;

  // Box B must be a month count between 0 and 12 (ITA s.118.6 enrolment period).
  if (typeof boxB === 'number' && numB > 12) {
    errors['boxB'] = 'Box B is part-time months enrolled (0–12), not a dollar amount';
  }

  // Box C must be a month count between 0 and 12.
  // If boxC > 12 AND boxA is 0, it is almost certainly a tuition-in-wrong-box error.
  if (typeof boxC === 'number' && numC > 12) {
    if (numA === 0) {
      likelyTuitionInWrongBox = true;
      errors['boxC'] =
        'Box C should be months, not tuition. Did you mean to enter this amount in Box A?';
    } else {
      errors['boxC'] = 'Box C is full-time months enrolled (0–12), not a dollar amount';
    }
  }

  return { errors, likelyTuitionInWrongBox };
}
