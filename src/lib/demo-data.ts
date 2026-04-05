/**
 * TaxAgent.ai — Demo / Sample Tax Data
 *
 * Used by Dashboard and Calculator pages to demonstrate the UI with realistic
 * numbers before Supabase integration is complete.
 *
 * TODO: remove this file once pages load data from Supabase.
 */

import type {
  TaxProfile,
  TaxSlip,
  BusinessIncome,
  RentalIncome,
  DeductionsCreditsInput,
} from './tax-engine/types';

export const DEMO_PROFILE: TaxProfile = {
  id: 'demo-profile-001',
  userId: 'demo-user-001',
  taxYear: 2025,
  legalName: 'Alex Johnson',
  dateOfBirth: '1989-03-15',
  maritalStatus: 'single',
  province: 'ON',
  residencyStatus: 'citizen',
  dependants: [],
  assessmentComplete: true,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-03-20T00:00:00Z',
};

export const DEMO_SLIPS: TaxSlip[] = [
  {
    type: 'T4',
    data: {
      issuerName: 'Acme Corp',
      box14: 85_000,    // Employment income
      box16: 3_799.80,  // CPP contributions
      box16A: 0,
      box17: 0,
      box18: 1_049.12,  // EI premiums
      box20: 0,
      box22: 17_500,    // Income tax deducted
      box24: 85_000,
      box26: 85_000,
      box40: 0,
      box42: 0,
      box44: 0,
      box45: '1',
      box46: 0,
      box52: 0,
      box85: 0,
    },
  },
  {
    type: 'T5',
    data: {
      issuerName: 'TD Bank',
      box11: 0,
      box12: 0,
      box13: 420,     // Interest income
      box14: 0,
      box18: 0,
      box24: 0,
      box25: 0,
      box26: 0,
    },
  },
];

export const DEMO_DEDUCTIONS: DeductionsCreditsInput = {
  rrspContributions: 5_000,
  rrspContributionRoom: 15_000,
  fhsaContributions: 0,
  unionDues: 0,
  childcareExpenses: 0,
  movingExpenses: 0,
  supportPaymentsMade: 0,
  carryingCharges: 0,
  studentLoanInterest: 0,

  medicalExpenses: [
    { description: 'Dental and prescriptions', amount: 2_200, forWhom: 'self' },
  ],
  donations: [
    { recipientName: 'Canadian Red Cross', amount: 500, type: 'cash', eligibleForProvincial: true },
  ],

  // Ontario-specific — renting in Toronto
  rentPaid: 21_600,   // $1,800/month
  propertyTaxPaid: 0,
  studentResidence: false,

  // No carryforwards in this demo
  tuitionCarryforward: 0,
  capitalLossCarryforward: 0,
  nonCapitalLossCarryforward: 0,
  donationCarryforward: 0,

  politicalContributions: 0,
  digitalNewsSubscription: 0,
  hasDisabilityCredit: false,
  homeBuyersEligible: false,
  homeAccessibilityExpenses: 0,
};

export const DEMO_BUSINESS: BusinessIncome[] = [];
export const DEMO_RENTAL: RentalIncome[] = [];
