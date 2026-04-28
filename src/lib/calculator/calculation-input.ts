import type {
  DeductionsCreditsInput,
  TaxProfile,
  TaxSlip,
} from '@/lib/tax-engine/types';
import type { SavedSlip, UserDeductions } from '@/lib/supabase/tax-data';

export type CalculatorUserDeductions = UserDeductions;

export const DEFAULT_CALCULATOR_USER_DEDUCTIONS: CalculatorUserDeductions = {
  rrspContributions: 0,
  rrspContributionRoom: 0,
  rentPaid: 0,
  propertyTaxPaid: 0,
  childcareExpenses: 0,
  movingExpenses: 0,
  supportPaymentsMade: 0,
  instalmentsPaid: 0,
  medicalExpenses: 0,
  charitableDonations: 0,
  studentLoanInterest: 0,
  unionDues: 0,
  tuitionCarryforward: 0,
  digitalNewsSubscription: 0,
  homeAccessibilityExpenses: 0,
  hasSpouseOrCL: false,
  spouseNetIncome: 0,
  hasEligibleDependant: false,
  eligibleDependantNetIncome: 0,
  caregiverForDependant18Plus: false,
  caregiverDependantNetIncome: 0,
  hasDisabilityCredit: false,
  homeBuyersEligible: false,
  volunteerFirefighter: false,
  searchAndRescue: false,
  canadaTrainingCreditRoom: 0,
  trainingFeesForCTC: 0,
};

export function makeCalculatorDeductions(
  overrides: Partial<DeductionsCreditsInput> = {},
): DeductionsCreditsInput {
  return {
    rrspContributions: 0,
    rrspContributionRoom: 0,
    fhsaContributions: 0,
    unionDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPaymentsMade: 0,
    carryingCharges: 0,
    studentLoanInterest: 0,
    medicalExpenses: [],
    donations: [],
    rentPaid: 0,
    propertyTaxPaid: 0,
    studentResidence: false,
    tuitionCarryforward: 0,
    capitalLossCarryforward: 0,
    nonCapitalLossCarryforward: 0,
    donationCarryforward: 0,
    politicalContributions: 0,
    digitalNewsSubscription: 0,
    hasDisabilityCredit: false,
    homeBuyersEligible: false,
    homeAccessibilityExpenses: 0,
    ...overrides,
  };
}

export function buildCalculatorDeductions(
  userDeductions: CalculatorUserDeductions,
): DeductionsCreditsInput {
  return makeCalculatorDeductions({
    rrspContributions: userDeductions.rrspContributions,
    rrspContributionRoom: userDeductions.rrspContributionRoom,
    rentPaid: userDeductions.rentPaid,
    propertyTaxPaid: userDeductions.propertyTaxPaid,
    childcareExpenses: userDeductions.childcareExpenses,
    movingExpenses: userDeductions.movingExpenses,
    supportPaymentsMade: userDeductions.supportPaymentsMade,
    instalmentsPaid: userDeductions.instalmentsPaid,
    medicalExpenses: userDeductions.medicalExpenses > 0
      ? [{
          description: 'Medical expenses',
          amount: userDeductions.medicalExpenses,
          forWhom: 'self',
        }]
      : [],
    donations: userDeductions.charitableDonations > 0
      ? [{
          recipientName: 'Charitable donations',
          amount: userDeductions.charitableDonations,
          type: 'cash',
          eligibleForProvincial: true,
        }]
      : [],
    studentLoanInterest: userDeductions.studentLoanInterest,
    unionDues: userDeductions.unionDues,
    tuitionCarryforward: userDeductions.tuitionCarryforward,
    digitalNewsSubscription: userDeductions.digitalNewsSubscription,
    homeAccessibilityExpenses: userDeductions.homeAccessibilityExpenses,
    hasSpouseOrCL: userDeductions.hasSpouseOrCL,
    spouseNetIncome: userDeductions.spouseNetIncome,
    hasEligibleDependant: userDeductions.hasEligibleDependant,
    eligibleDependantNetIncome: userDeductions.eligibleDependantNetIncome,
    caregiverForDependant18Plus: userDeductions.caregiverForDependant18Plus,
    caregiverDependantNetIncome: userDeductions.caregiverDependantNetIncome,
    hasDisabilityCredit: userDeductions.hasDisabilityCredit,
    homeBuyersEligible: userDeductions.homeBuyersEligible,
    volunteerFirefighter: userDeductions.volunteerFirefighter,
    searchAndRescue: userDeductions.searchAndRescue,
    canadaTrainingCreditRoom: userDeductions.canadaTrainingCreditRoom,
    trainingFeesForCTC: userDeductions.trainingFeesForCTC,
  });
}

export function buildCalculatorProfile({
  userId,
  profileName,
  taxProfile,
  assessmentComplete,
  now = new Date().toISOString(),
}: {
  userId: string;
  profileName: string;
  taxProfile: TaxProfile | null;
  assessmentComplete: boolean;
  now?: string;
}): TaxProfile {
  const fallbackId = userId || 'local-user';

  return {
    id: taxProfile?.id || fallbackId,
    userId: taxProfile?.userId || fallbackId,
    taxYear: taxProfile?.taxYear ?? 2025,
    legalName: taxProfile?.legalName || profileName || 'Taxpayer',
    dateOfBirth: taxProfile?.dateOfBirth || '1990-01-01',
    maritalStatus: taxProfile?.maritalStatus ?? 'single',
    province: taxProfile?.province ?? 'ON',
    residencyStatus: taxProfile?.residencyStatus ?? 'citizen',
    residencyStartDate: taxProfile?.residencyStartDate,
    dependants: taxProfile?.dependants ?? [],
    assessmentComplete: taxProfile?.assessmentComplete ?? assessmentComplete,
    createdAt: taxProfile?.createdAt || now,
    updatedAt: taxProfile?.updatedAt || now,
  };
}

type BoxMap = Record<string, number | string | null | undefined>;

function n(v: number | string | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function s(v: number | string | null | undefined): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

export function savedSlipToTaxSlip(slip: SavedSlip): TaxSlip | null {
  const b = slip.data as BoxMap;

  switch (slip.type) {
    case 'T4':
      return {
        type: 'T4',
        data: {
          issuerName: slip.issuerName,
          box14: n(b.box14),
          box16: n(b.box16),
          box16A: n(b.box16A),
          box17: n(b.box17),
          box18: n(b.box18),
          box20: n(b.box20),
          box22: n(b.box22),
          box24: n(b.box24),
          box26: n(b.box26),
          box40: n(b.box40),
          box42: n(b.box42),
          box44: n(b.box44),
          box45: s(b.box45),
          box46: n(b.box46),
          box52: n(b.box52),
          box85: n(b.box85),
        },
      };

    case 'T5':
      return {
        type: 'T5',
        data: {
          issuerName: slip.issuerName,
          box11: n(b.box11),
          box12: n(b.box12),
          box13: n(b.box13),
          box14: n(b.box14),
          box15: n(b.box15),
          box16: n(b.box16),
          box18: n(b.box18),
          box24: n(b.box24),
          box25: n(b.box25),
          box26: n(b.box26),
        },
      };

    case 'T5008':
      return {
        type: 'T5008',
        data: {
          issuerName: slip.issuerName,
          box15: s(b.box15),
          box16: s(b.box16),
          box20: n(b.box20),
          box21: n(b.box21),
          box22: n(b.box22),
        },
      };

    case 'T3':
      return {
        type: 'T3',
        data: {
          issuerName: slip.issuerName,
          box21: n(b.box21),
          box22: n(b.box22),
          box23: n(b.box23),
          box25: n(b.box25),
          box26: n(b.box26),
          box32: n(b.box32),
          box37: n(b.box37),
          box49: n(b.box49),
          box50: n(b.box50),
        },
      };

    case 'T4A':
      return {
        type: 'T4A',
        data: {
          issuerName: slip.issuerName,
          box016: n(b.box016),
          box018: n(b.box018),
          box020: n(b.box020),
          box022: n(b.box022),
          box024: n(b.box024),
          box028: n(b.box028),
          box048: n(b.box048),
          box105: n(b.box105),
          box135: n(b.box135),
        },
      };

    case 'T2202':
      return {
        type: 'T2202',
        data: {
          institutionName: slip.issuerName || s(b.institutionName),
          boxA: n(b.boxA),
          boxB: n(b.boxB),
          boxC: n(b.boxC),
        },
      };

    case 'T4E':
      return {
        type: 'T4E',
        data: {
          box14: n(b.box14),
          box22: n(b.box22),
        },
      };

    case 'T5007':
      return {
        type: 'T5007',
        data: {
          box10: n(b.box10),
        },
      };

    case 'T4AP':
      return {
        type: 'T4AP',
        data: {
          issuerName: slip.issuerName,
          box16: n(b.box16),
          box20: n(b.box20),
          box22: n(b.box22),
        },
      };

    case 'T4AOAS':
      return {
        type: 'T4AOAS',
        data: {
          issuerName: slip.issuerName,
          box18: n(b.box18),
          box21: n(b.box21),
          box22: n(b.box22),
        },
      };

    case 'T4RSP':
      return {
        type: 'T4RSP',
        data: {
          issuerName: slip.issuerName,
          box20: n(b.box20),
          box22: n(b.box22),
        },
      };

    case 'T4RIF':
      return {
        type: 'T4RIF',
        data: {
          issuerName: slip.issuerName,
          box16: n(b.box16),
          box30: n(b.box30),
        },
      };

    case 'RRSP-Receipt':
      return {
        type: 'RRSP-Receipt',
        data: {
          issuerName: slip.issuerName,
          amount: n(b.amount),
          planType: s(b.planType) || 'RRSP',
        },
      };

    case 'T4FHSA':
      return {
        type: 'T4FHSA',
        data: {
          issuerName: slip.issuerName,
          box14: n(b.box14),
          box22: n(b.box22),
          box24: n(b.box24),
        },
      };

    default:
      return null;
  }
}

export function savedSlipsToTaxSlips(slips: SavedSlip[]): TaxSlip[] {
  return slips.map(savedSlipToTaxSlip).filter((slip): slip is TaxSlip => slip !== null);
}
