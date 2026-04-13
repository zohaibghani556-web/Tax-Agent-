/**
 * TaxAgent.ai — Family Joint Tax Optimizer
 *
 * Finds the allocation of income and deductions between two spouses that
 * minimises the combined federal + Ontario tax payable for the household.
 *
 * Optimization dimensions:
 *   1. Childcare claimant — CRA rule (ITA s.63): lower-income spouse must
 *      claim unless an exception applies (student, disabled, incarcerated).
 *      We evaluate both options and flag the CRA constraint.
 *   2. Pension income splitting — ITA s.60.03 / 56(1)(a.2): up to 50% of
 *      eligible pension from either spouse can be allocated to the other.
 *      We sweep $0 → 50% in $500 increments for each spouse's pension.
 *   3. Spousal RRSP — ITA s.146(5.1): contributions to a spousal RRSP use
 *      the contributor's room but grow in the spouse's name (withdrawn later
 *      at the spouse's marginal rate, subject to 3-year attribution rule).
 *      This module models only the current-year deduction allocation — the
 *      optimal strategy is for the higher-income spouse to claim the deduction.
 *
 * Uses the flat-input engine (src/lib/taxEngine.ts) for all tax calculations.
 */

import { calculateTaxes, type TaxInput } from '../taxEngine';

// ============================================================
// ROUNDING HELPER
// ============================================================

/** CRA rounding: nearest cent, half rounds up (ITA s.257). */
function roundCRA(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// INPUT / OUTPUT TYPES
// ============================================================

/**
 * One spouse's full tax situation.
 * Pass the same fields you would give calculateTaxes() for a single return.
 */
export interface SpouseInput {
  /** Employment income — T4 Box 14 */
  employmentIncome: number;
  /** Net self-employment income after T2125 expenses */
  selfEmploymentNetIncome: number;
  /**
   * Eligible pension income for splitting purposes — T4A Box 016, T4RIF,
   * annuities for age 65+. CPP / OAS are NOT eligible (ITA s.60.03).
   */
  pensionIncome: number;
  /** All other income: interest, dividends (actual), capital gains, other */
  otherIncome: number;
  /** RRSP contribution claimed this year (limited by room below) */
  rrspContribution: number;
  /** Available RRSP room from prior-year NOA */
  rrspContributionRoom: number;
  /** Age on December 31 of the tax year — drives age amount, pension credit */
  age: number;
  /** Total income tax withheld at source (T4 Box 22, T4A Box 22, etc.) */
  taxWithheld: number;
}

export interface FamilyInput {
  spouseA: SpouseInput;
  spouseB: SpouseInput;
  /**
   * Total household childcare expenses eligible for deduction (ITA s.63).
   * The optimizer allocates these to the optimal spouse subject to CRA rules.
   */
  childcareExpenses: number;
  /**
   * Additional eligible pension income available for splitting beyond what is
   * already on each spouse's SpouseInput.  Typically leave as 0; set only when
   * you want to override the auto-sum of spouseA.pensionIncome +
   * spouseB.pensionIncome.
   */
  pensionIncome?: number;
}

export interface OptimalAllocation {
  /** Which spouse claims the childcare deduction (ITA s.63) */
  childcareClaimedBy: 'A' | 'B';
  /**
   * Dollar amount of eligible pension income shifted to the receiving spouse.
   * Positive = A gives to B, Negative = B gives to A.
   */
  pensionSplitAmount: number;
  /**
   * RRSP recommendation for current year.
   * Always favour the higher-income spouse claiming the deduction; if they have
   * room, contributing to a spousal RRSP achieves the deduction now plus
   * income-splitting on future withdrawals.
   */
  rrspRecommendation: string;
}

export interface FamilyOptimization {
  /** The allocation that minimises combined household tax */
  optimalAllocation: OptimalAllocation;

  /** Combined tax under the optimal allocation */
  familyTaxOptimal: number;
  /** Combined tax if each spouse files fully independently (no optimizations) */
  familyTaxNaive: number;
  /** familyTaxNaive − familyTaxOptimal */
  savingsFromOptimization: number;

  // Individual tax under optimal allocation
  spouseATaxOptimal: number;
  spouseBTaxOptimal: number;
  // Individual tax under naive filing
  spouseATaxNaive: number;
  spouseBTaxNaive: number;
  // Individual net income (for reference)
  spouseANetIncome: number;
  spouseBNetIncome: number;

  /**
   * Plain-English explanations of each optimization action and its dollar
   * impact.  Suitable for display in the UI without further formatting.
   */
  explanations: string[];
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Converts a SpouseInput into the full TaxInput required by calculateTaxes().
 * All unmodelled fields default to zero / false.
 */
function toTaxInput(s: SpouseInput, overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    // Income
    employmentIncome:        s.employmentIncome,
    selfEmploymentNetIncome: s.selfEmploymentNetIncome,
    otherEmploymentIncome:   0,
    pensionIncome:           s.pensionIncome,
    annuityIncome:           0,
    rrspIncome:              0,
    otherIncome:             s.otherIncome,
    interestIncome:          0,
    eligibleDividends:       0,
    ineligibleDividends:     0,
    capitalGains:            0,
    capitalLossesPriorYears: 0,
    rentalIncome:            0,
    rentalExpenses:          0,
    foreignIncome:           0,
    foreignTaxPaid:          0,
    eiRegularBenefits:       0,
    socialAssistance:        0,
    workersComp:             0,
    disabilityPensionCPP:    0,
    oasPension:              0,
    netPartnershipIncome:    0,
    scholarshipFellowship:   0,
    researchGrants:          0,

    // Deductions
    rrspContribution:        s.rrspContribution,
    rrspContributionRoom:    s.rrspContributionRoom,
    prppContribution:        0,
    fhsaContribution:        0,
    unionDues:               0,
    profDues:                0,
    childcareExpenses:       0,   // set per-scenario in overrides
    movingExpenses:          0,
    supportPayments:         0,
    carryingCharges:         0,
    employmentExpenses:      0,
    otherDeductions:         0,

    // Credits
    age:                           s.age,
    isBlind:                       false,
    hasDisability:                 false,
    hasDisabledSpouse:             false,
    hasDisabledDependent:          false,
    disabledDependentAge:          0,
    hasSpouse:                     true,   // assume married
    spouseNetIncome:               0,      // overridden when we know both incomes
    numberOfDependentsUnder18:     0,
    numberOfDependents18Plus:      0,
    isCaregiver:                   false,
    tuitionFederal:                0,
    tuitionCarryforwardFed:        0,
    studentLoanInterest:           0,
    medicalExpenses:               0,
    charitableDonations:           0,
    politicalContributions:        0,
    ontarioPoliticalContributions: 0,
    firstTimeHomeBuyer:            false,
    homeAccessibilityReno:         0,
    adoptionExpenses:              0,
    pensionIncomeSplitting:        0,
    isVolunteerFirefighter:        false,
    isSearchAndRescue:             false,
    digitalNewsSubscriptions:      0,

    // Payroll
    taxWithheld:             s.taxWithheld,
    cppContributedEmployee:  0,
    cpp2ContributedEmployee: 0,
    eiContributedEmployee:   0,

    // Ontario
    rentPaid:                       0,
    propertyTaxPaid:                0,
    isNorthernOntario:              false,
    ontarioSalesTaxCreditEligible:  false,

    // Misc
    installmentsPaid:          0,
    fhsaWithdrawal:            0,
    hasPriorYearCapitalLosses: false,
    numberOfChildren:          0,
    numberOfChildrenUnder6:    0,
    hasSpouseForBenefits:      true,

    // Apply caller overrides last
    ...overrides,
  };
}

/** Combined tax for a given (A, B) TaxInput pair. */
function combinedTax(aIn: TaxInput, bIn: TaxInput): number {
  return roundCRA(
    calculateTaxes(aIn).summary.totalTaxPayable +
    calculateTaxes(bIn).summary.totalTaxPayable
  );
}

/** Net income (line 23600) for a TaxInput. */
function netIncome(input: TaxInput): number {
  return calculateTaxes(input).summary.netIncome;
}

/** Format a dollar value with commas and two decimal places. */
function fmt(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

// ============================================================
// MAIN OPTIMIZER
// ============================================================

/**
 * Finds the allocation of childcare, pension splitting, and RRSP deductions
 * that minimises the combined federal + Ontario tax for a married / common-law
 * couple filing in Ontario.
 *
 * @param input - FamilyInput with each spouse's tax situation.
 * @returns     - FamilyOptimization including savings and plain-English advice.
 */
export function optimize(input: FamilyInput): FamilyOptimization {
  const { spouseA, spouseB, childcareExpenses } = input;

  // ── Build base TaxInput for each spouse (no optimization applied yet) ────

  const baseA = toTaxInput(spouseA, { childcareExpenses: 0 });
  const baseB = toTaxInput(spouseB, { childcareExpenses: 0 });

  // ── Naive: each files independently, childcare to lower-income earner ────
  // CRA rule (ITA s.63): childcare must be claimed by the lower-income spouse.
  const netA_base = netIncome(baseA);
  const netB_base = netIncome(baseB);

  // Identify lower-income spouse for naive baseline
  const naiveCCBy: 'A' | 'B' = netA_base <= netB_base ? 'A' : 'B';
  const naiveA = toTaxInput(spouseA, {
    childcareExpenses: naiveCCBy === 'A' ? childcareExpenses : 0,
  });
  const naiveB = toTaxInput(spouseB, {
    childcareExpenses: naiveCCBy === 'B' ? childcareExpenses : 0,
  });

  const spouseATaxNaive = calculateTaxes(naiveA).summary.totalTaxPayable;
  const spouseBTaxNaive = calculateTaxes(naiveB).summary.totalTaxPayable;
  const familyTaxNaive  = roundCRA(spouseATaxNaive + spouseBTaxNaive);

  // ── Eligible pension pool for splitting ──────────────────────────────────
  // Each spouse's pension is eligible for up to 50% transfer (ITA s.60.03).
  // We test splitting from A→B and from B→A independently.
  const pensionA = spouseA.pensionIncome;
  const pensionB = spouseB.pensionIncome;

  // ── Sweep all optimization combinations ─────────────────────────────────

  let bestTax     = familyTaxNaive; // start with naive as baseline
  let bestA_tax   = spouseATaxNaive;
  let bestB_tax   = spouseBTaxNaive;
  let bestCC: 'A' | 'B'  = naiveCCBy;
  let bestSplit   = 0;  // positive = A→B, negative = B→A

  /**
   * CRA allows childcare to be claimed by the higher-income spouse in limited
   * circumstances (lower spouse is in full-time school, is infirm/disabled,
   * or is absent/incarcerated for 90+ days — ITA s.63(2)).
   * We evaluate both options and flag when the rule applies.
   */
  const ccOptions: Array<'A' | 'B'> = ['A', 'B'];

  // Pension split sweep: $0 → 50% in $500 steps for each direction
  const splitOptions: number[] = [0];
  for (let s = 500; s <= Math.floor(pensionA * 0.5 / 500) * 500; s += 500) {
    splitOptions.push(s);   // A gives s to B
  }
  for (let s = 500; s <= Math.floor(pensionB * 0.5 / 500) * 500; s += 500) {
    splitOptions.push(-s);  // B gives s to A (stored as negative)
  }
  // Deduplicate (0 appears once)
  const uniqueSplits = [...new Set(splitOptions)];

  for (const cc of ccOptions) {
    for (const split of uniqueSplits) {
      const pensionAAdj = split >= 0
        ? roundCRA(pensionA - split)   // A gives pension to B
        : roundCRA(pensionA + Math.abs(split)); // A receives from B

      const pensionBAdj = split >= 0
        ? roundCRA(pensionB + split)   // B receives from A
        : roundCRA(pensionB - Math.abs(split)); // B gives to A

      // Skip invalid scenarios (pension can't go negative)
      if (pensionAAdj < 0 || pensionBAdj < 0) continue;

      const aIn = toTaxInput(
        { ...spouseA, pensionIncome: pensionAAdj },
        {
          childcareExpenses: cc === 'A' ? childcareExpenses : 0,
          pensionIncomeSplitting: split > 0 ? split : 0,
        }
      );
      const bIn = toTaxInput(
        { ...spouseB, pensionIncome: pensionBAdj },
        {
          childcareExpenses: cc === 'B' ? childcareExpenses : 0,
          pensionIncomeSplitting: split < 0 ? Math.abs(split) : 0,
        }
      );

      const tax = combinedTax(aIn, bIn);

      if (tax < bestTax) {
        bestTax   = tax;
        bestA_tax = calculateTaxes(aIn).summary.totalTaxPayable;
        bestB_tax = calculateTaxes(bIn).summary.totalTaxPayable;
        bestCC    = cc;
        bestSplit = split;
      }
    }
  }

  const savingsFromOptimization = roundCRA(familyTaxNaive - bestTax);

  // ── RRSP recommendation ──────────────────────────────────────────────────
  // Higher-income spouse should claim the RRSP deduction. If they have room,
  // contributing to a spousal RRSP gives them the deduction today while
  // shifting future withdrawals to the lower-income spouse's hands.
  const higherIncome = netA_base >= netB_base ? 'A' : 'B';
  const lowerLabel   = higherIncome === 'A' ? 'Spouse B' : 'Spouse A';
  const higherLabel  = higherIncome === 'A' ? 'Spouse A' : 'Spouse B';
  const higherRoom   = higherIncome === 'A'
    ? spouseA.rrspContributionRoom
    : spouseB.rrspContributionRoom;

  let rrspRecommendation: string;
  if (higherRoom > 0) {
    rrspRecommendation =
      `${higherLabel} has higher income and $${higherRoom.toLocaleString()} of RRSP room. ` +
      `Contributing to a spousal RRSP for ${lowerLabel} lets ${higherLabel} claim the deduction ` +
      `now (at their higher marginal rate) while future withdrawals are taxed in ${lowerLabel}'s ` +
      `hands — maximising lifetime household tax savings. Note: the 3-year attribution rule ` +
      `applies; ${lowerLabel} should not withdraw until 3 years after the last contribution.`;
  } else {
    rrspRecommendation =
      `${higherLabel} has higher income but no remaining RRSP room this year. ` +
      `Consider maximising ${lowerLabel}'s own RRSP contributions to reduce household income ` +
      `for benefit phase-outs (GST credit, OTB, CWB).`;
  }

  // ── Build explanations ───────────────────────────────────────────────────
  const explanations: string[] = [];
  const savings = savingsFromOptimization;

  if (savings <= 0) {
    explanations.push(
      'Filing independently with no adjustments already produces the minimum combined tax for this household. No further optimization is possible with the current income and deduction profile.'
    );
  } else {
    explanations.push(
      `Total household tax savings from optimization: ${fmt(savings)}.`
    );
  }

  // Childcare explanation
  if (childcareExpenses > 0) {
    const lowerIncomeLabel = naiveCCBy === 'A' ? 'Spouse A' : 'Spouse B';
    if (bestCC !== naiveCCBy) {
      // Higher-income spouse claiming — explain the exception
      const higherIncomeLabel = bestCC === 'A' ? 'Spouse A' : 'Spouse B';
      explanations.push(
        `Childcare expenses of ${fmt(childcareExpenses)} are claimed by ${higherIncomeLabel} ` +
        `(the higher-income spouse). This is only permitted under CRA exceptions — e.g., if ` +
        `${lowerIncomeLabel} was in full-time education, was infirm/disabled, or was absent ` +
        `for 90+ days. Verify your situation qualifies under ITA s.63(2) before filing.`
      );
    } else {
      explanations.push(
        `Childcare expenses of ${fmt(childcareExpenses)} are claimed by ${lowerIncomeLabel} ` +
        `(the lower-income spouse), as required by CRA under ITA s.63. This is already optimal ` +
        `— the deduction is applied where it reduces the most family tax.`
      );
    }
  }

  // Pension split explanation
  if (bestSplit !== 0) {
    const fromLabel  = bestSplit > 0 ? 'Spouse A' : 'Spouse B';
    const toLabel    = bestSplit > 0 ? 'Spouse B' : 'Spouse A';
    const splitAmt   = Math.abs(bestSplit);
    const splitPct   = bestSplit > 0
      ? roundCRA((splitAmt / pensionA) * 100)
      : roundCRA((splitAmt / pensionB) * 100);
    explanations.push(
      `Pension income splitting: ${fmt(splitAmt)} (${splitPct}% of eligible pension) is ` +
      `transferred from ${fromLabel} to ${toLabel} under ITA s.60.03. This moves income from ` +
      `a higher marginal rate bracket to a lower one, saving the household ${fmt(savings > 0 ? savings : 0)} ` +
      `in combined tax. Both spouses must jointly elect Form T1032 when filing.`
    );
  } else if (pensionA > 0 || pensionB > 0) {
    explanations.push(
      'Pension income splitting was evaluated but provides no benefit with the current income levels. ' +
      'The spouses are already in similar tax brackets, so reallocating pension income would not reduce combined tax.'
    );
  }

  // RRSP
  explanations.push(rrspRecommendation);

  // ── Return result ────────────────────────────────────────────────────────
  return {
    optimalAllocation: {
      childcareClaimedBy: bestCC,
      pensionSplitAmount: bestSplit,
      rrspRecommendation,
    },
    familyTaxOptimal:       bestTax,
    familyTaxNaive:         familyTaxNaive,
    savingsFromOptimization: savingsFromOptimization,
    spouseATaxOptimal:      bestA_tax,
    spouseBTaxOptimal:      bestB_tax,
    spouseATaxNaive:        spouseATaxNaive,
    spouseBTaxNaive:        spouseBTaxNaive,
    spouseANetIncome:       roundCRA(netA_base),
    spouseBNetIncome:       roundCRA(netB_base),
    explanations,
  };
}
