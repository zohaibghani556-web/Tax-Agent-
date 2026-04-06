/**
 * TaxAgent.ai — Canadian Tax Knowledge Module (2025 Tax Year)
 *
 * Structured knowledge base injected into the Claude system prompt at runtime.
 * Provides authoritative grounding for credit eligibility, common mistakes,
 * Ontario-specific rules, and slip-to-T1-line mappings.
 *
 * This is NOT prose — it is structured data consumed by buildContextualSystemPrompt().
 * All values cross-referenced against CRA publications and constants.ts.
 */

import type { TaxProfile } from '@/lib/tax-engine/types';

// ============================================================
// INTERFACES
// ============================================================

export interface CreditRule {
  name: string;
  craLine: string;
  description: string;
  eligibilityConditions: string[];
  amount2025: number | string;
  clawbackRule: string | null;
  supportingDocument: string;
}

export interface CommonMistake {
  situation: string;
  mistake: string;
  correction: string;
}

export interface OntarioRule {
  description: string;
  details: string;
  amount2025: number | string;
}

export interface SlipFieldReference {
  boxNumber: string;
  fieldName: string;
  whereItGoesInReturn: string;
}

export interface TaxKnowledge2025 {
  CREDITS_AND_ELIGIBILITY: Record<string, CreditRule>;
  COMMON_MISTAKES: CommonMistake[];
  ONTARIO_SPECIFIC: Record<string, OntarioRule>;
  SLIP_CROSS_REFERENCE: Record<string, SlipFieldReference[]>;
}

// ============================================================
// KNOWLEDGE MODULE
// ============================================================

export const TAX_KNOWLEDGE_2025: TaxKnowledge2025 = {

  // ──────────────────────────────────────────────────────────
  // SECTION 1: CREDITS AND ELIGIBILITY
  // ──────────────────────────────────────────────────────────

  CREDITS_AND_ELIGIBILITY: {

    basicPersonalAmount: {
      name: 'Basic Personal Amount (BPA)',
      craLine: 'Schedule 1, Line 30000',
      description: 'Every Canadian resident gets a basic exemption on their first dollars of income. Nobody pays federal tax on income below this amount.',
      eligibilityConditions: [
        'Must be a Canadian resident for tax purposes on December 31, 2025',
        'Full amount ($16,129) available if net income ≤ $177,882',
        'Reduced linearly between $177,882 and $253,414',
        'Minimum amount ($14,538) applies at income ≥ $253,414',
        'Newcomers must prorate by days resident in 2025 ÷ 365',
      ],
      amount2025: '$16,129 (full) to $14,538 (minimum)',
      clawbackRule: 'Additional $1,591 clawed back between $177,882 and $253,414 at a linear rate',
      supportingDocument: 'No document required — automatic',
    },

    ageAmount: {
      name: 'Age Amount',
      craLine: 'Schedule 1, Line 30100',
      description: 'Extra credit for Canadians aged 65 or older on December 31, 2025.',
      eligibilityConditions: [
        'Must be 65 or older on or before December 31, 2025',
        'Must be a Canadian resident',
        'Age is calculated as of December 31 of the tax year',
      ],
      amount2025: '$9,028 maximum',
      clawbackRule: 'Reduced by 15% of net income over $44,325. Fully eliminated at net income ~$104,520',
      supportingDocument: 'No document required — based on date of birth on file',
    },

    spouseOrCLPAmount: {
      name: 'Spouse or Common-Law Partner Amount',
      craLine: 'Schedule 1, Line 30300',
      description: 'Credit for supporting a spouse or common-law partner with little or no income.',
      eligibilityConditions: [
        'Married or common-law on December 31, 2025',
        'Supported the spouse/partner at any time in 2025',
        'Spouse/partner net income must be less than the federal BPA ($16,129)',
        'Cannot claim if living separately due to marriage breakdown on Dec 31',
      ],
      amount2025: 'BPA minus spouse/partner net income (max $16,129)',
      clawbackRule: 'Reduced dollar-for-dollar by spouse/partner net income',
      supportingDocument: 'Spouse/partner net income confirmation (their NOA or verbal confirmation)',
    },

    canadaCaregiver: {
      name: 'Canada Caregiver Credit',
      craLine: 'Schedule 1 (combined into Line 30300, 30400, or 30450)',
      description: 'Credit for Canadians who care for a dependent with a physical or mental impairment.',
      eligibilityConditions: [
        'Must be caring for a spouse, common-law partner, or dependant',
        'Dependant must have a physical or mental impairment',
        'For dependants 18+: credit is $8,375 minus net income over the BPA ($16,129)',
        'For spouse/partner: adds up to $2,350 to the spousal amount',
        'A T2201 (Disability Tax Credit Certificate) is NOT required — but documentation of impairment is',
      ],
      amount2025: '$8,375 for infirm dependant 18+ (reduced by dependant income over BPA)',
      clawbackRule: 'Reduced by dependant net income exceeding the federal BPA ($16,129)',
      supportingDocument: 'Medical documentation of impairment (doctor letter, medical records)',
    },

    cppCredit: {
      name: 'CPP Employee Contributions',
      craLine: 'Schedule 1, Line 30800 (CPP1) / Line 30900 (CPP2)',
      description: 'Non-refundable credit for CPP contributions made through employment.',
      eligibilityConditions: [
        'Must have employment income',
        'Based on Box 16 (CPP1) and Box 16A (CPP2) of T4 slip',
        'Maximum CPP1 employee contribution: $4,034.10',
        'Maximum CPP2 employee contribution: $396.00',
        'If over-deducted by employer, only the maximum is creditable',
      ],
      amount2025: 'Up to $4,034.10 (CPP1) + $396.00 (CPP2)',
      clawbackRule: null,
      supportingDocument: 'T4 slip (Box 16, Box 16A)',
    },

    eiCredit: {
      name: 'EI Premiums',
      craLine: 'Schedule 1, Line 31200',
      description: 'Non-refundable credit for Employment Insurance premiums paid.',
      eligibilityConditions: [
        'Must have employment income',
        'Based on Box 18 of T4 slip',
        'Maximum 2025 EI premium: $1,077.48',
        'If over-deducted by employer, only the maximum is creditable',
      ],
      amount2025: 'Up to $1,077.48',
      clawbackRule: null,
      supportingDocument: 'T4 slip (Box 18)',
    },

    canadaEmploymentAmount: {
      name: 'Canada Employment Amount',
      craLine: 'Schedule 1, Line 31260',
      description: 'Flat credit for employed Canadians to offset work-related expenses like uniforms and tools.',
      eligibilityConditions: [
        'Must have employment income from a T4',
        'No receipts required',
        'Cannot be claimed if only self-employment income',
      ],
      amount2025: '$1,368',
      clawbackRule: null,
      supportingDocument: 'T4 slip (any employment income)',
    },

    homeBuyersAmount: {
      name: "Home Buyers' Amount",
      craLine: 'Schedule 1, Line 31270',
      description: 'One-time credit for first-time home buyers who purchased a qualifying home in 2025.',
      eligibilityConditions: [
        'Purchased a qualifying home in Canada in 2025',
        'First-time buyer: neither you nor your spouse/partner owned a home in the current year or any of the prior four years',
        'Exception: persons with a disability or purchasing for a disabled person may qualify even if not first-time',
        'Must intend to occupy the home as principal place of residence by year-end following purchase',
      ],
      amount2025: '$10,000 × 15% = $1,500 federal tax credit',
      clawbackRule: null,
      supportingDocument: 'Purchase agreement, land transfer documents',
    },

    homeAccessibilityTaxCredit: {
      name: 'Home Accessibility Tax Credit (HATC)',
      craLine: 'Schedule 1, Line 31285',
      description: 'Credit for expenses to make a home more accessible for a senior or person with a disability.',
      eligibilityConditions: [
        'Claimant must be 65+ OR be eligible for the Disability Tax Credit',
        'OR claiming for an eligible individual who lives in the home',
        'Expenses must be for a qualifying renovation to improve accessibility or safety',
        'Examples: grab bars, wheelchair ramps, walk-in bathtubs, widened doorways',
        'Cannot double-claim with medical expenses for the same expense',
      ],
      amount2025: 'Up to $20,000 in eligible expenses × 15% = up to $3,000 credit',
      clawbackRule: null,
      supportingDocument: 'Contractor invoices/receipts, proof of payment',
    },

    medicalExpenses: {
      name: 'Medical Expense Tax Credit (METC)',
      craLine: 'Schedule 1, Line 33099 (self/family) / Line 33199 (other dependants)',
      description: 'Credit for out-of-pocket medical expenses exceeding a minimum threshold.',
      eligibilityConditions: [
        'Eligible expenses include: prescriptions, dental, vision, medical devices, attendant care',
        'Must be paid in any 12-month period ending in 2025',
        'Threshold: the LESSER of $2,759 or 3% of your net income',
        'Only expenses above the threshold generate a credit',
        'Can claim for self, spouse, or common-law partner without a separate threshold',
        'Claims for other dependants (children, parents) have a separate $7,999 cap',
      ],
      amount2025: '(Total eligible expenses − lesser of $2,759 or 3% of net income) × 15%',
      clawbackRule: 'Threshold = min($2,759, 3% of net income). No credit generated below threshold.',
      supportingDocument: 'Receipts for all medical expenses; prescription labels; practitioner invoices',
    },

    charitableDonations: {
      name: 'Charitable Donations Tax Credit',
      craLine: 'Schedule 9, Line 34900',
      description: 'Credit for donations to registered Canadian charities. Higher rate on amounts over $200.',
      eligibilityConditions: [
        'Must donate to a registered charity (CRA number on receipt)',
        'Receipts must be official tax receipts from the charity',
        'Maximum annual claim: 75% of net income (100% in year of death)',
        'Unused amounts can be carried forward up to 5 years',
        'Spouses/partners can pool donations on one return for better tax efficiency',
      ],
      amount2025: 'First $200 at 15%; amounts over $200 at 29% (or 33% if taxable income > $253,414)',
      clawbackRule: null,
      supportingDocument: 'Official donation receipts from registered charities (keep for 6 years)',
    },

    tuition: {
      name: 'Tuition Tax Credit',
      craLine: 'Schedule 11, Line 32300 (self) / Line 32400 (transfer)',
      description: 'Credit for eligible tuition fees paid to accredited post-secondary institutions.',
      eligibilityConditions: [
        'Fees must be paid to a qualifying Canadian institution or certain foreign universities',
        'Minimum $100 per institution (fees under $100 not claimable)',
        'Full-time and part-time enrollment both qualify',
        'Current-year amount: reduces student tax payable',
        'Unused amounts carry forward indefinitely to future years',
        'Up to $5,000 can be transferred to a parent, grandparent, or spouse (must exhaust own tax payable first)',
        'IMPORTANT: Ontario eliminated its provincial tuition credit after 2017 — only federal credit available',
      ],
      amount2025: 'Eligible tuition × 15% federal credit rate',
      clawbackRule: null,
      supportingDocument: 'T2202 (Tuition and Enrolment Certificate) from the institution',
    },

    studentLoanInterest: {
      name: 'Student Loan Interest',
      craLine: 'Schedule 1, Line 31900',
      description: 'Credit for interest paid on qualifying government student loans.',
      eligibilityConditions: [
        'Only interest on loans under the Canada Student Loans Act, Canada Apprentice Loan Act, or provincial equivalent',
        'Private bank loans, lines of credit, or parent loans DO NOT qualify',
        'Can only be claimed by the student (not parents)',
        'Unused interest can be carried forward 5 years',
      ],
      amount2025: 'Interest paid × 15% federal credit rate',
      clawbackRule: null,
      supportingDocument: 'T4A slip (Box 27) or statement from National Student Loans Service Centre',
    },

    disabilityTaxCredit: {
      name: 'Disability Tax Credit (DTC)',
      craLine: 'Schedule 1, Line 31600 (self) / Line 31800 (transferred)',
      description: 'Credit for individuals with a severe and prolonged physical or mental impairment.',
      eligibilityConditions: [
        'Must have a CRA-approved T2201 (Disability Tax Credit Certificate)',
        'T2201 must be signed by a qualified medical practitioner',
        'Impairment must be severe and prolonged (12+ months, significantly restricts basic activities)',
        'If unused by the person with disability, can be transferred to a supporting person',
        'Additional supplement for children under 18 (up to $5,758 in 2025)',
      ],
      amount2025: '$9,872 base amount; up to $5,758 additional for under-18',
      clawbackRule: 'Child supplement reduced dollar-for-dollar by child care and attendant care expenses over $3,464',
      supportingDocument: 'CRA-approved Form T2201 (must be on file with CRA)',
    },

    digitalNewsSubscription: {
      name: 'Digital News Subscription Tax Credit',
      craLine: 'Schedule 1, Line 31350',
      description: 'Credit for subscriptions to qualifying Canadian digital news publications.',
      eligibilityConditions: [
        'Subscription must be to a qualifying Canadian journalism organization',
        'Must be for digital news only (not print)',
        'Cannot include video or audio content subscriptions',
        'Claim period: amounts paid in 2025',
      ],
      amount2025: 'Up to $500 in eligible subscriptions × 15% = up to $75 credit',
      clawbackRule: null,
      supportingDocument: 'Subscription receipts or statements from qualifying news publishers',
    },

    fhsaDeduction: {
      name: 'First Home Savings Account (FHSA) Deduction',
      craLine: 'Schedule 15, Line 20805',
      description: 'Tax deduction for contributions made to a First Home Savings Account. Reduces net income.',
      eligibilityConditions: [
        'Must be a Canadian resident, age 18+',
        'Must be a first-time home buyer (no ownership in current year or prior 4 years)',
        'Account must be opened at a qualifying financial institution',
        'Annual contribution limit: $8,000',
        'Lifetime contribution limit: $40,000',
        'Unused annual room carries forward (one year only)',
        'Withdrawals for qualifying home purchase are tax-free',
      ],
      amount2025: 'Up to $8,000 annual deduction (or $16,000 if first year and prior year room available)',
      clawbackRule: null,
      supportingDocument: 'FHSA contribution receipt from financial institution',
    },

    ontarioBPA: {
      name: 'Ontario Basic Personal Amount',
      craLine: 'ON428, Line 5804',
      description: 'Ontario version of the BPA. Every Ontario resident gets this credit against provincial tax.',
      eligibilityConditions: [
        'Must be an Ontario resident on December 31, 2025',
        'Newcomers must prorate by days resident in Ontario in 2025',
      ],
      amount2025: '$12,747',
      clawbackRule: null,
      supportingDocument: 'No document required — automatic for Ontario residents',
    },

    ontarioSeniorHomeownersGrant: {
      name: 'Ontario Senior Homeowners Property Tax Grant',
      craLine: 'ON-BEN, Line 63070',
      description: 'Annual grant for low-to-moderate income seniors who own their home.',
      eligibilityConditions: [
        'Must be 64 or older on December 31, 2025',
        'Must have owned and occupied a principal residence in Ontario in 2025',
        'Adjusted family net income must be below the threshold',
        'Cannot also claim the Ontario Energy and Property Tax Credit (OEPTC)',
        'Claim on ON-BEN form with tax return',
      ],
      amount2025: 'Up to $500 (income-tested)',
      clawbackRule: 'Reduced for incomes above approximately $35,000 (single) or $45,000 (family)',
      supportingDocument: 'Property tax bill showing property address',
    },

    ontarioTrilliumBenefit: {
      name: 'Ontario Trillium Benefit (OTB)',
      craLine: 'ON-BEN (filed with T1)',
      description: 'Combines three Ontario benefits: Ontario Energy and Property Tax Credit (OEPTC), Ontario Sales Tax Credit (OSTC), and Northern Ontario Energy Credit (NOEC). Paid monthly starting July 2026.',
      eligibilityConditions: [
        'Must be an Ontario resident on December 31, 2025',
        'OSTC: anyone with income below ~$50,000 (single); no minimum age',
        'OEPTC: must have paid rent or property tax on a principal Ontario residence',
        '       Students in a designated post-secondary residence claim energy component only ($280)',
        'NOEC: only for residents of Northern Ontario (Algoma, Cochrane, Kenora, Manitoulin, Nipissing, Parry Sound, Rainy River, Sudbury, Thunder Bay, Timiskaming)',
        'Must file a T1 return and complete the ON-BEN form',
      ],
      amount2025: 'OSTC: up to $345/adult. OEPTC: up to $1,248 non-senior ($1,421 senior) + $280 energy. Reduced by income above $29,047.',
      clawbackRule: 'OSTC: 4% of adjusted family net income over $29,047. OEPTC: 2% of adjusted family net income over $29,047.',
      supportingDocument: 'Rent receipts or property tax bill (landlord name, address, amount paid)',
    },

    ontarioPoliticalContribution: {
      name: 'Ontario Political Contribution Tax Credit',
      craLine: 'ON428, Line 5896',
      description: 'Credit for contributions to Ontario political parties or constituency associations.',
      eligibilityConditions: [
        'Must be an Ontario resident',
        'Contributions must be to a registered Ontario provincial party or riding association',
        'Federal political contributions are a separate federal credit',
        'Maximum contribution that generates a credit: $2,017',
      ],
      amount2025: '75% of first $441, 50% of next $441–$1,534, 33.3% of $1,534–$2,017. Max credit: $1,033.',
      clawbackRule: null,
      supportingDocument: 'Official receipt from the Ontario political party or riding association',
    },

    ontarioChildrensActivityCredit: {
      name: "Ontario Children's Activity Credit",
      craLine: 'N/A — EXPIRED',
      description: 'This credit was ELIMINATED by the Ontario government after the 2016 tax year. Do NOT claim it for 2025.',
      eligibilityConditions: [
        'THIS CREDIT NO LONGER EXISTS for 2025',
        'It was eliminated effective January 1, 2017',
        'If a user mentions this credit, advise them it has been discontinued',
      ],
      amount2025: '$0 — credit discontinued',
      clawbackRule: null,
      supportingDocument: 'N/A',
    },

  },

  // ──────────────────────────────────────────────────────────
  // SECTION 2: COMMON MISTAKES
  // ──────────────────────────────────────────────────────────

  COMMON_MISTAKES: [
    {
      situation: 'User reports RRSP contribution to a spousal RRSP',
      mistake: 'Treating it exactly like a personal RRSP contribution',
      correction: 'The deduction is still on the contributor\'s return (uses their RRSP room). BUT withdrawal attribution rules apply: if the spouse withdraws within 3 calendar years of any spousal contribution, the withdrawn amount is taxed in the contributor\'s hands (ITA s.146(8.3)). Must flag this.',
    },
    {
      situation: 'User sold their principal residence in 2025',
      mistake: 'Reporting full capital gain or assuming it is fully tax-free automatically',
      correction: 'The principal residence exemption can shelter the gain fully or partially, but the sale must be REPORTED on Schedule 3 and Form T2091 even if fully exempt. Ask: Was this their principal residence for every year owned? If not, partial exemption applies.',
    },
    {
      situation: 'User reports T4A income',
      mistake: 'Treating all T4A income the same way',
      correction: 'T4A income is a catch-all slip. Box 016 = pension (line 11500). Box 020 = self-employment commissions (T2125 required). Box 028 = other income (line 13000). Box 105 = scholarships/bursaries (fully exempt for full-time students). Each box flows to a different T1 line with different tax treatment.',
    },
    {
      situation: 'User reports foreign income or foreign assets',
      mistake: 'Assuming Canadian tax rules apply to foreign income or that it only needs to be reported on the foreign country\'s return',
      correction: 'Canadian residents are taxed on worldwide income. Foreign income must be reported in CAD at the Bank of Canada rate. If foreign assets exceeded CAD $100,000 at any point in 2025, Form T1135 (Foreign Income Verification) is REQUIRED — failure to file has steep penalties ($500/month up to $24,000).',
    },
    {
      situation: 'User has childcare expenses',
      mistake: 'Claiming on the higher-income spouse\'s return',
      correction: 'Childcare expenses must be claimed by the LOWER-income spouse/partner in almost all cases (ITA s.63(2)). The higher-income spouse can only claim if the lower-income spouse was in school, hospital, or prison for at least 2 weeks.',
    },
    {
      situation: 'User is separated',
      mistake: 'Claiming married status or filing as if still together',
      correction: 'To claim as separated for 2025, must have lived apart from the spouse for at least 90 consecutive days due to marriage breakdown. If separation happened partway through 2025 and the 90-day period was not complete by December 31, 2025, the status may still be "married" for 2025 filing purposes.',
    },
    {
      situation: 'User reports income from multiple T4 slips (multiple employers)',
      mistake: 'Missing over-deduction of CPP or EI by multiple employers',
      correction: 'Each employer withholds CPP/EI as if it were the only employer. If total Box 16 across all T4s exceeds $4,034.10 (CPP1 max), the excess was over-deducted. The tax engine should cap the CPP credit at the maximum and flag the over-deduction — the taxpayer can claim a refund of the over-deducted CPP on line 44800.',
    },
    {
      situation: 'User reports buying their first home',
      mistake: 'Missing the Home Buyers\' Amount or FHSA deduction',
      correction: 'First-time buyers can claim the Home Buyers\' Amount ($10,000 × 15% = $1,500 credit). If they opened an FHSA and contributed before buying, those contributions are deductible AND withdrawals are tax-free. Both can be claimed in the same year.',
    },
    {
      situation: 'User received EI (Employment Insurance) benefits',
      mistake: 'Not reporting EI income, or assuming it is non-taxable',
      correction: 'EI benefits ARE taxable income (line 11900, from T4E slip box 14). Tax may or may not have been withheld (T4E box 22). High-income earners may also face EI clawback: if net income exceeds $79,000, 30% of lesser of EI received or net income over $79,000 is repaid.',
    },
    {
      situation: 'User reports capital gains from 2025',
      mistake: 'Applying the 2/3 inclusion rate that was proposed for 2025',
      correction: 'For the 2025 tax year, the capital gains inclusion rate is a FLAT 50% for all individuals. The proposed increase to 2/3 was DEFERRED to January 1, 2026. Use 50% for all 2025 capital gains regardless of the amount.',
    },
    {
      situation: 'User has a student loan',
      mistake: 'Claiming interest on a bank loan, line of credit, or parent loan',
      correction: 'Only interest on government student loans qualifies (Canada Student Loans, Canada Apprentice Loan, provincial equivalent). Private bank loans and family loans do NOT qualify, even if used for education.',
    },
    {
      situation: 'User mentions Ontario Children\'s Activity Credit',
      mistake: 'Trying to claim a credit that no longer exists',
      correction: 'The Ontario Children\'s Activity Credit was eliminated after 2016. For 2025, this credit does not exist. Advise the user it is no longer available.',
    },
    {
      situation: 'User is new to Canada (arrived in 2025)',
      mistake: 'Claiming full-year credits without proration',
      correction: 'Newcomers who became residents partway through 2025 must prorate most personal credits (BPA, age amount, etc.) by the number of days they were resident in Canada in 2025 divided by 365. Income is only reported from the date of arrival. A partial-year T1 return is required.',
    },
    {
      situation: 'User received a scholarship or bursary',
      mistake: 'Treating scholarships as fully taxable',
      correction: 'For FULL-TIME post-secondary students, scholarship and bursary income is FULLY EXEMPT from tax (ITA s.56(3)). For part-time students, only $500 is exempt. The amount comes from T4A box 105 — the full-time exemption means no tax is owing on this income.',
    },
    {
      situation: 'User made RRSP contributions in the first 60 days of 2026 (Jan 1 – Mar 3, 2026)',
      mistake: 'Not knowing these can be applied to the 2025 tax year',
      correction: 'RRSP contributions made in the first 60 days of 2026 (up to March 3, 2026) can be deducted on the 2025 return OR carried forward. This is a key planning opportunity — ask if they made any early 2026 RRSP contributions.',
    },
  ],

  // ──────────────────────────────────────────────────────────
  // SECTION 3: ONTARIO-SPECIFIC RULES
  // ──────────────────────────────────────────────────────────

  ONTARIO_SPECIFIC: {

    surtax: {
      description: 'Ontario Surtax — additional tax on top of basic Ontario tax (Ontario Taxation Act s.48)',
      details: 'Applied to basic Ontario tax (after all credits and low-income reduction), NOT to taxable income. Two tiers: 20% on the amount of basic Ontario tax exceeding $6,104; an additional 36% on the amount exceeding $7,812. Combined effect above $7,812: 56% extra on that portion.',
      amount2025: '20% on basic Ontario tax > $6,104; +36% on basic Ontario tax > $7,812',
    },

    healthPremium: {
      description: 'Ontario Health Premium (OHP) — charged based on taxable income, NOT basic Ontario tax',
      details: 'A premium (not a credit) charged to Ontario residents based on taxable income bracket. Ranges from $0 (income ≤ $20,000) to $900 (income ≥ $200,600). Key breakpoints: income $20,001–$25,000 pays 6% of income over $20,000; income $25,001–$36,000 pays $300 + 6% of income over $25,000 (max $300 more = $600 total at $36,000); income $36,001–$48,600 generally stabilizes around $600 before the $72,000 bracket; income $72,001–$200,600 pays $900 flat.',
      amount2025: '$0 to $900 depending on taxable income bracket',
    },

    lowIncomeTaxReduction: {
      description: 'Ontario Low-Income Tax Reduction (LITR) — reduces basic Ontario tax for lower-income earners',
      details: 'Provides a reduction of up to $294 in basic Ontario tax. This reduction is clawed back at 5.05% of taxable income above $18,569. The reduction is fully eliminated at approximately $24,391 taxable income. Applied BEFORE the Ontario surtax calculation.',
      amount2025: 'Up to $294 reduction (Ontario Taxation Act s.8(3))',
    },

    ontarioTuitionCredit: {
      description: 'Ontario Tuition Credit — does NOT exist for 2025',
      details: 'Ontario eliminated its provincial tuition credit after the 2017 tax year. For 2025, only the FEDERAL tuition credit (15%) applies to tuition fees. There is NO Ontario-level tuition credit. Do not tell users they can get a provincial tuition credit in Ontario.',
      amount2025: '$0 — eliminated',
    },

    otbPaymentSchedule: {
      description: 'Ontario Trillium Benefit (OTB) — payment schedule and how to claim',
      details: 'Claimed on the ON-BEN form filed with the 2025 T1 return. If the annual OTB entitlement is $360 or less, it is paid as a single lump sum in July 2026. If over $360, paid monthly from July 2026 to June 2027. Taxpayers can elect to receive the full amount as a single payment in June 2027. The benefit year runs July to June.',
      amount2025: 'Paid starting July 2026 based on 2025 return',
    },

  },

  // ──────────────────────────────────────────────────────────
  // SECTION 4: SLIP CROSS-REFERENCE (Slip Box → T1 Line)
  // ──────────────────────────────────────────────────────────

  SLIP_CROSS_REFERENCE: {

    T4: [
      { boxNumber: 'Box 14', fieldName: 'Employment income', whereItGoesInReturn: 'Line 10100 (Employment income)' },
      { boxNumber: 'Box 16', fieldName: 'Employee CPP contributions', whereItGoesInReturn: 'Line 30800 (Schedule 1 — CPP credit amount)' },
      { boxNumber: 'Box 16A', fieldName: 'Employee CPP2 contributions', whereItGoesInReturn: 'Line 30900 (Schedule 1 — CPP2 credit amount)' },
      { boxNumber: 'Box 17', fieldName: 'Employee QPP contributions', whereItGoesInReturn: 'Line 30800 (if Quebec QPP, same as CPP line)' },
      { boxNumber: 'Box 18', fieldName: 'EI premiums paid by employee', whereItGoesInReturn: 'Line 31200 (Schedule 1 — EI credit amount)' },
      { boxNumber: 'Box 20', fieldName: 'RPP contributions', whereItGoesInReturn: 'Line 20700 (RPP deduction from net income)' },
      { boxNumber: 'Box 22', fieldName: 'Income tax deducted', whereItGoesInReturn: 'Line 43700 (total income tax deducted at source)' },
      { boxNumber: 'Box 40', fieldName: 'Other taxable allowances and benefits', whereItGoesInReturn: 'Line 10100 (included in employment income)' },
      { boxNumber: 'Box 44', fieldName: 'Union dues', whereItGoesInReturn: 'Line 21200 (union dues deduction)' },
      { boxNumber: 'Box 52', fieldName: 'Pension adjustment', whereItGoesInReturn: 'Line 20600 (reduces RRSP room — not a deduction on T1)' },
    ],

    T4A: [
      { boxNumber: 'Box 016', fieldName: 'Pension or superannuation', whereItGoesInReturn: 'Line 11500 (Other pensions and superannuation)' },
      { boxNumber: 'Box 018', fieldName: 'Lump-sum payments', whereItGoesInReturn: 'Line 13000 (Other income) — may qualify for averaging' },
      { boxNumber: 'Box 020', fieldName: 'Self-employed commissions', whereItGoesInReturn: 'Line 13900 (T2125 required for self-employment)' },
      { boxNumber: 'Box 022', fieldName: 'Income tax deducted', whereItGoesInReturn: 'Line 43700 (total income tax deducted at source)' },
      { boxNumber: 'Box 024', fieldName: 'Annuities', whereItGoesInReturn: 'Line 13000 (Other income)' },
      { boxNumber: 'Box 027', fieldName: 'Registered Disability Savings Plan (RDSP) income', whereItGoesInReturn: 'Line 12500 (RDSP income)' },
      { boxNumber: 'Box 028', fieldName: 'Other income', whereItGoesInReturn: 'Line 13000 (Other income)' },
      { boxNumber: 'Box 105', fieldName: 'Scholarships, fellowships, bursaries', whereItGoesInReturn: 'Line 13010 (Scholarships — fully exempt for full-time students)' },
    ],

    T5: [
      { boxNumber: 'Box 11', fieldName: 'Taxable amount of non-eligible dividends (grossed-up)', whereItGoesInReturn: 'Line 12010 (Taxable amount of other (non-eligible) dividends)' },
      { boxNumber: 'Box 12', fieldName: 'Actual amount of non-eligible dividends', whereItGoesInReturn: 'Used to calculate Box 11 gross-up — not directly entered' },
      { boxNumber: 'Box 13', fieldName: 'Interest from Canadian sources', whereItGoesInReturn: 'Line 12100 (Interest and other investment income)' },
      { boxNumber: 'Box 24', fieldName: 'Actual amount of eligible dividends', whereItGoesInReturn: 'Used to calculate Box 25 gross-up — not directly entered' },
      { boxNumber: 'Box 25', fieldName: 'Taxable amount of eligible dividends (grossed-up)', whereItGoesInReturn: 'Line 12000 (Taxable amount of eligible dividends)' },
      { boxNumber: 'Box 26', fieldName: 'Dividend tax credit for eligible dividends', whereItGoesInReturn: 'Line 40425 (Schedule 1 — dividend tax credit)' },
    ],

    T3: [
      { boxNumber: 'Box 21', fieldName: 'Capital gains', whereItGoesInReturn: 'Schedule 3 (Capital gains — 50% taxable, line 12700)' },
      { boxNumber: 'Box 23', fieldName: 'Taxable amount of eligible dividends', whereItGoesInReturn: 'Line 12000 (combined with T5 Box 25)' },
      { boxNumber: 'Box 26', fieldName: 'Other income', whereItGoesInReturn: 'Line 13000 (Other income)' },
      { boxNumber: 'Box 32', fieldName: 'Taxable amount of non-eligible dividends', whereItGoesInReturn: 'Line 12010 (combined with T5 Box 11)' },
      { boxNumber: 'Box 49', fieldName: 'Interest from Canadian sources', whereItGoesInReturn: 'Line 12100 (combined with T5 Box 13)' },
    ],

    T5008: [
      { boxNumber: 'Box 20', fieldName: 'Cost or book value (ACB)', whereItGoesInReturn: 'Schedule 3 — used to calculate capital gain/loss' },
      { boxNumber: 'Box 21', fieldName: 'Proceeds of disposition', whereItGoesInReturn: 'Schedule 3 — capital gain = Box 21 minus Box 20; 50% taxable in 2025' },
    ],

    T2202: [
      { boxNumber: 'Box A', fieldName: 'Eligible tuition fees', whereItGoesInReturn: 'Schedule 11, Line 32300 (Tuition amount)' },
      { boxNumber: 'Box B', fieldName: 'Months of part-time enrollment', whereItGoesInReturn: 'Schedule 11 — affects education amount (now eliminated federally, none for Ontario)' },
      { boxNumber: 'Box C', fieldName: 'Months of full-time enrollment', whereItGoesInReturn: 'Schedule 11 — determines scholarship exemption eligibility (full-time = fully exempt)' },
    ],

    T4E: [
      { boxNumber: 'Box 14', fieldName: 'Total EI benefits paid', whereItGoesInReturn: 'Line 11900 (Employment insurance and other benefits)' },
      { boxNumber: 'Box 22', fieldName: 'Income tax deducted', whereItGoesInReturn: 'Line 43700 (total income tax deducted at source)' },
    ],

    T5007: [
      { boxNumber: 'Box 10', fieldName: 'Social assistance payments', whereItGoesInReturn: 'Line 14500 (Social assistance payments — included in income, deducted at line 25000)' },
    ],

  },
};

// ============================================================
// PROFILE-BASED RELEVANCE FILTERS
// ============================================================

/**
 * Returns the credit keys most relevant to this user's tax profile.
 * Used to select which credits to inject into the system prompt context.
 */
export function getRelevantCreditKeys(profile: Partial<TaxProfile>): string[] {
  const keys: string[] = ['basicPersonalAmount', 'ontarioBPA', 'ontarioTrilliumBenefit'];

  if (!profile.dateOfBirth) return keys;

  const dec31 = new Date('2025-12-31');
  const birth = new Date(profile.dateOfBirth);
  const age =
    dec31.getFullYear() - birth.getFullYear() -
    (dec31 < new Date(dec31.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

  if (age >= 65) {
    keys.push('ageAmount', 'ontarioSeniorHomeownersGrant');
  }

  if (profile.maritalStatus === 'married' || profile.maritalStatus === 'common-law') {
    keys.push('spouseOrCLPAmount');
  }

  if (profile.residencyStatus === 'newcomer') {
    keys.push('basicPersonalAmount', 'ontarioBPA');
  }

  if (profile.dependants && profile.dependants.length > 0) {
    keys.push('canadaCaregiver');
    if (profile.dependants.some(d => d.hasDisability)) {
      keys.push('disabilityTaxCredit');
    }
  }

  return [...new Set(keys)];
}

/**
 * Filters common mistakes to those relevant to a given tax profile.
 * Prevents injecting irrelevant warnings into the prompt.
 */
export function getRelevantMistakes(
  profile: Partial<TaxProfile>
): typeof TAX_KNOWLEDGE_2025.COMMON_MISTAKES {
  const all = TAX_KNOWLEDGE_2025.COMMON_MISTAKES;

  // Always include separation, newcomer if relevant
  return all.filter(m => {
    if (m.situation.includes('separated') && profile.maritalStatus !== 'separated') return false;
    if (m.situation.includes('new to Canada') && profile.residencyStatus !== 'newcomer') return false;
    return true;
  });
}
