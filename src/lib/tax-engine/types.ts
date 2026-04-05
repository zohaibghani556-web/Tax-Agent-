/**
 * TaxAgent.ai — Core TypeScript Interfaces
 * All tax data structures used across the application.
 */

// ============================================================
// TAX PROFILE (User's complete tax situation)
// ============================================================

export interface TaxProfile {
  id: string;
  userId: string;
  taxYear: number;
  
  // Personal info
  legalName: string;
  dateOfBirth: string;         // ISO date
  maritalStatus: MaritalStatus;
  province: 'ON';              // Ontario only for now
  residencyStatus: ResidencyStatus;
  residencyStartDate?: string; // For newcomers
  
  // Dependants
  dependants: Dependant[];
  
  // Assessment state
  assessmentComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MaritalStatus = 
  | 'single' 
  | 'married' 
  | 'common-law' 
  | 'separated' 
  | 'divorced' 
  | 'widowed';

export type ResidencyStatus = 
  | 'citizen' 
  | 'permanent-resident' 
  | 'deemed-resident' 
  | 'newcomer' 
  | 'non-resident';

export interface Dependant {
  name: string;
  dateOfBirth: string;
  relationship: 'child' | 'spouse' | 'parent' | 'other';
  netIncome: number;
  hasDisability: boolean;
  inFullTimeCare: boolean;
}

// ============================================================
// TAX SLIPS
// ============================================================

export interface T4Slip {
  issuerName: string;
  box14: number;   // Employment income
  box16: number;   // Employee CPP contributions
  box16A: number;  // Employee CPP2 contributions
  box17: number;   // Employee QPP contributions
  box18: number;   // Employee EI premiums
  box20: number;   // RPP contributions
  box22: number;   // Income tax deducted
  box24: number;   // EI insurable earnings
  box26: number;   // CPP/QPP pensionable earnings
  box40: number;   // Other taxable allowances
  box42: number;   // Employment commissions
  box44: number;   // Union dues
  box45: string;   // Dental benefits code (1-5)
  box46: number;   // Charitable donations
  box52: number;   // Pension adjustment
  box85: number;   // Employee-paid premiums (ON)
}

export interface T5Slip {
  issuerName: string;
  box11: number;   // Taxable dividends (non-eligible)
  box12: number;   // Actual dividends (non-eligible)
  box13: number;   // Interest from Canadian sources
  box14: number;   // Other income
  box18: number;   // Capital gains dividends
  box24: number;   // Actual eligible dividends
  box25: number;   // Taxable eligible dividends
  box26: number;   // Dividend tax credit (eligible)
}

export interface T5008Slip {
  issuerName: string;
  box15: string;   // Type of income code
  box16: string;   // Security description
  box20: number;   // Cost or book value (ACB)
  box21: number;   // Proceeds of disposition
  box22: number;   // Quantity
}

export interface T3Slip {
  issuerName: string;
  box21: number;   // Capital gains
  box22: number;   // Actual eligible dividends
  box23: number;   // Taxable eligible dividends
  box26: number;   // Other income
  box32: number;   // Taxable other dividends
  box49: number;   // Interest
  box50: number;   // Other investment income
}

export interface T4ASlip {
  issuerName: string;
  box016: number;  // Pension or superannuation
  box018: number;  // Lump-sum payments
  box020: number;  // Self-employed commissions
  box022: number;  // Income tax deducted
  box024: number;  // Annuities
  box028: number;  // Other income
  box105: number;  // Scholarships/bursaries/fellowships
  box135: number;  // RESP accumulated income
}

export interface T2202Slip {
  institutionName: string;
  boxA: number;    // Eligible tuition fees
  boxB: number;    // Months part-time
  boxC: number;    // Months full-time
}

export interface T4ESlip {
  box14: number;   // Total EI benefits paid
  box22: number;   // Income tax deducted
}

export interface T5007Slip {
  box10: number;   // Social assistance payments
}

export type TaxSlip = 
  | { type: 'T4'; data: T4Slip }
  | { type: 'T5'; data: T5Slip }
  | { type: 'T5008'; data: T5008Slip }
  | { type: 'T3'; data: T3Slip }
  | { type: 'T4A'; data: T4ASlip }
  | { type: 'T2202'; data: T2202Slip }
  | { type: 'T4E'; data: T4ESlip }
  | { type: 'T5007'; data: T5007Slip };

// ============================================================
// SELF-EMPLOYMENT (T2125)
// ============================================================

export interface BusinessIncome {
  businessName: string;
  businessType: 'sole-proprietorship' | 'professional' | 'commission';
  industryCode: string;
  
  grossIncome: number;
  
  expenses: BusinessExpenses;
  
  homeOffice?: HomeOfficeExpense;
  vehicle?: VehicleExpense;
  
  netIncome: number;  // Calculated: gross - expenses
}

export interface BusinessExpenses {
  advertising: number;
  meals: number;              // Only 50% deductible
  insurance: number;
  interest: number;
  officeExpenses: number;
  supplies: number;
  legalAccounting: number;
  travel: number;
  telephone: number;
  utilities: number;
  rent: number;
  propertyTaxes: number;
  salariesWages: number;
  capitalCostAllowance: number;
  otherExpenses: number;
}

export interface HomeOfficeExpense {
  method: 'simplified' | 'detailed';
  // Simplified: $2/day, max 250 days ($500)
  daysWorkedAtHome?: number;
  // Detailed: pro-rated by area
  totalSquareFeet?: number;
  officeSquareFeet?: number;
  // Expenses to pro-rate
  rent?: number;
  utilities?: number;
  insurance?: number;
  propertyTax?: number;
  mortgageInterest?: number;
  maintenance?: number;
}

export interface VehicleExpense {
  totalKm: number;
  businessKm: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  license: number;
  leasePayments: number;
  capitalCostAllowance: number;
  // Calculated
  businessUsePercentage: number;
  deductibleAmount: number;
}

// ============================================================
// RENTAL INCOME (T776)
// ============================================================

export interface RentalIncome {
  propertyAddress: string;
  ownershipPercentage: number; // 0-100
  grossRent: number;
  expenses: {
    advertising: number;
    insurance: number;
    interest: number;
    maintenance: number;
    managementFees: number;
    officeExpenses: number;
    legalAccounting: number;
    propertyTaxes: number;
    utilities: number;
    capitalCostAllowance: number;
    other: number;
  };
  netIncome: number;
}

// ============================================================
// DEDUCTIONS & CREDITS INPUT
// ============================================================

export interface DeductionsCreditsInput {
  // Deductions (reduce net income)
  rrspContributions: number;
  rrspContributionRoom: number;
  fhsaContributions: number;
  unionDues: number;           // Usually from T4 box 44
  childcareExpenses: number;
  movingExpenses: number;
  supportPaymentsMade: number;
  carryingCharges: number;
  studentLoanInterest: number;

  // Credits
  medicalExpenses: MedicalExpense[];
  donations: Donation[];
  
  // Ontario-specific
  rentPaid: number;            // For OTB/OEPTC
  propertyTaxPaid: number;     // For OTB/OEPTC
  studentResidence: boolean;   // Designated university/college residence
  
  // Carryforwards
  tuitionCarryforward: number;
  capitalLossCarryforward: number;
  nonCapitalLossCarryforward: number;
  donationCarryforward: number;
  
  // Other
  politicalContributions: number;
  digitalNewsSubscription: number;
  hasDisabilityCredit: boolean;
  homeBuyersEligible: boolean;
  homeAccessibilityExpenses: number;
}

export interface MedicalExpense {
  description: string;
  amount: number;
  forWhom: 'self' | 'spouse' | 'dependant';
}

export interface Donation {
  recipientName: string;
  amount: number;
  type: 'cash' | 'gift-in-kind';
  eligibleForProvincial: boolean;
}

// ============================================================
// CORPORATE (T2)
// ============================================================

export interface CorporateReturn {
  corporationName: string;
  businessNumber: string;
  fiscalYearEnd: string;
  isCCPC: boolean;
  
  activeBusinessIncome: number;
  investmentIncome: number;
  taxableIncome: number;
  
  financialStatements: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    operatingExpenses: number;
    netIncomeBeforeTax: number;
    incomeTaxProvision: number;
    netIncomeAfterTax: number;
    // Balance sheet
    totalAssets: number;
    totalLiabilities: number;
    shareholdersEquity: number;
  };
  
  hstCollected: number;
  hstITC: number;             // Input Tax Credits
  hstNetowing: number;        // Collected - ITC
  
  payrollEmployees: PayrollEmployee[];
  dividendsPaid: {
    eligible: number;
    nonEligible: number;
  };
}

export interface PayrollEmployee {
  name: string;
  /**
   * SIN MUST be encrypted via Supabase Vault before persistence.
   * Never store in plaintext. Never log. Display masked (***-***-XXX) only.
   * See: CLAUDE.md Security Checklist, PIPEDA s.4.7
   *
   * TODO: encrypt with Vault.encrypt() before INSERT, decrypt on SELECT.
   */
  sin: string;
  grossPay: number;
  cppDeducted: number;
  eiDeducted: number;
  taxDeducted: number;
  rppContributions: number;
  unionDues: number;
  taxableBenefits: number;
}

// ============================================================
// CALCULATION RESULTS
// ============================================================

export interface TaxCalculationResult {
  // Income
  totalIncome: number;
  netIncome: number;
  taxableIncome: number;
  
  // Federal
  federalTaxOnIncome: number;
  federalNonRefundableCredits: number;
  federalDividendTaxCredit: number;
  topUpTaxCredit: number;
  netFederalTax: number;
  
  // Ontario
  ontarioTaxOnIncome: number;
  ontarioNonRefundableCredits: number;
  ontarioDividendTaxCredit: number;
  ontarioSurtax: number;
  ontarioHealthPremium: number;
  ontarioLowIncomeReduction: number;
  netOntarioTax: number;
  
  // Totals
  totalTaxPayable: number;
  totalTaxDeducted: number;    // From T4s, T4As, etc.
  totalInstalmentsApplied: number;
  
  // Bottom line
  balanceOwing: number;        // Positive = owes, negative = refund
  
  // Benefits estimates (OTB for 2026 based on 2025 return)
  estimatedOTB: number;
  estimatedGSTCredit: number;
  
  // Detailed breakdown for UI
  lineByLine: Record<number, number>; // CRA line number → amount
  
  // What-if scenarios
  marginalFederalRate: number;
  marginalOntarioRate: number;
  combinedMarginalRate: number;
  averageTaxRate: number;
  
  // Warnings
  warnings: TaxWarning[];
}

export interface TaxWarning {
  severity: 'info' | 'warning' | 'error';
  message: string;
  line?: number;               // Related CRA line
  action?: string;             // Suggested action
}

// ============================================================
// FILING GUIDE
// ============================================================

export interface FilingStep {
  stepNumber: number;
  title: string;
  description: string;
  formReference?: string;      // e.g., "Schedule 1", "ON428", "ON-BEN"
  lineReference?: number;      // CRA line number
  value?: number;              // The value to enter
  tip?: string;                // Helpful context
}

export interface FilingGuide {
  profileSummary: string;
  requiredForms: string[];
  steps: FilingStep[];
  documentsToKeep: string[];   // For CRA record-keeping (6 years)
  importantDates: { date: string; description: string }[];
}
