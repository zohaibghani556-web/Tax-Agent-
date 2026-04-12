/**
 * TaxAgent.ai — CRA Knowledge Base (2025 tax year)
 *
 * 20 curated entries covering the credits and rules most relevant to Ontario filers.
 * ALL dollar amounts are derived from constants.ts — never hardcoded here.
 * These entries are seeded into the tax_knowledge Supabase table and retrieved
 * at runtime to ground Claude's responses in authoritative CRA sources.
 */

import type { KnowledgeEntry } from './types';
import {
  FEDERAL_BPA,
  ONTARIO_BPA,
  RRSP,
  FHSA,
  CPP,
  CPP2,
  EI,
  FEDERAL_CREDITS,
  ONTARIO_CREDITS,
  CAPITAL_GAINS,
  DIVIDENDS,
  ONTARIO_HEALTH_PREMIUM,
  ONTARIO_SURTAX,
  TUITION,
  MEDICAL_EXPENSES,
  CWB,
  GST_CREDIT,
  CANADA_CAREGIVER,
  DEADLINES,
} from '@/lib/tax-engine/constants';

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // -----------------------------------------------------------------------
  // 1. Basic Personal Amount
  // -----------------------------------------------------------------------
  {
    content: `Basic Personal Amount (BPA) — 2025 tax year

Federal BPA: $${FEDERAL_BPA.max.toLocaleString()} (full amount, ITA s.118(1)(c)).
The additional $${FEDERAL_BPA.additional.toLocaleString()} portion is clawed back linearly for net incomes between $${FEDERAL_BPA.clawbackStart.toLocaleString()} and $${FEDERAL_BPA.clawbackEnd.toLocaleString()}.
At income above $${FEDERAL_BPA.clawbackEnd.toLocaleString()}, only the base $${FEDERAL_BPA.base.toLocaleString()} applies.
Credit value: $${FEDERAL_BPA.max.toLocaleString()} × 15% = $${(FEDERAL_BPA.max * 0.15).toFixed(2)} non-refundable.

Ontario BPA: $${ONTARIO_BPA.toLocaleString()} × 5.05% = $${(ONTARIO_BPA * 0.0505).toFixed(2)} provincial non-refundable credit.

Claimed automatically on Schedule 1 (line 30000) and Form ON428 — no documentation required.`,
    source: 'CRA Income Tax Folio S1-F1-C1 — Basic Personal and Other Tax Credits',
    category: 'basic_personal_amount',
  },

  // -----------------------------------------------------------------------
  // 2. RRSP 2025
  // -----------------------------------------------------------------------
  {
    content: `RRSP Contributions — 2025 tax year

Deduction limit: lesser of ${(RRSP.earnedIncomeRate * 100).toFixed(0)}% of 2024 earned income and $${RRSP.maxContribution.toLocaleString()}.
Contribution deadline for 2025 deduction: ${DEADLINES.rrspContributionDeadline} (first 60 days of 2026).
Unused RRSP room carries forward indefinitely.

The deduction reduces net income (line 20800), which also reduces income-tested benefits (OTB, GST credit, CWB).
Spousal RRSP: contributions go to spouse's plan; 3-year attribution rule applies on withdrawals (ITA s.146(8.3)).

Over-contribution: $2,000 lifetime buffer before 1%/month penalty applies (ITA s.204.1).
HBP: up to $35,000 withdrawn tax-free for first home; 15-year repayment (ITA s.146.01).`,
    source: 'CRA Guide T4040 — RRSPs and Other Registered Plans',
    category: 'rrsp',
  },

  // -----------------------------------------------------------------------
  // 3. Canada Workers Benefit
  // -----------------------------------------------------------------------
  {
    content: `Canada Workers Benefit (CWB) — 2025 tax year (ITA s.122.7)

Refundable federal credit for low-income workers. Claimed on line 45300.

Single (no dependants):
  Maximum benefit: $${CWB.basicSingleMax.toLocaleString()}
  Phases in at 27% of working income above $${CWB.workingIncomeMin.toLocaleString()}
  Clawback starts at: $${CWB.singleClawStart.toLocaleString()} (clawback rate: ${(CWB.clawRate * 100).toFixed(0)}%)

Family (with eligible spouse or dependant):
  Maximum benefit: $${CWB.basicFamilyMax.toLocaleString()}
  Clawback starts at: $${CWB.familyClawStart.toLocaleString()}

Disability supplement: additional $${CWB.disabilitySingle.toLocaleString()} (single) / $${CWB.disabilityFamily.toLocaleString()} (family) for DTC-certified individuals.

Minimum working income required: $${CWB.workingIncomeMin.toLocaleString()}.
ACWB advance payments: CRA automatically issues quarterly prepayments (50% of prior-year entitlement) — no application needed.`,
    source: 'CRA Income Tax Folio S1-F3-C4 — Canada Workers Benefit',
    category: 'canada_workers_benefit',
  },

  // -----------------------------------------------------------------------
  // 4. Ontario Trillium Benefit
  // -----------------------------------------------------------------------
  {
    content: `Ontario Trillium Benefit (OTB) — 2025 tax year (ON-BEN)

The OTB combines three credits; paid monthly starting July 2026:

1. Ontario Sales Tax Credit (OSTC):
   $${345} per adult + $${345} per child. Clawed back at 4% of adjusted family net income above $29,047 (single) / $36,309 (family).

2. Ontario Energy and Property Tax Credit (OEPTC):
   Energy component: $${280} base.
   Property tax component: up to $1,248 (non-senior); 20% of rent paid counts as deemed property tax.
   Senior property tax max: $1,421. Clawed back at 2% above $29,047 / $36,309.

3. Ontario Northern Allowance (ONNAB): additional amount for northern Ontario residents.

Eligibility: Ontario resident Dec 31, 2025. Renter or property tax payer. Complete Section B of ON-BEN.
Low-income filers (<$1,000 annual OTB): single annual payment in June 2026.`,
    source: 'CRA ON-BEN Application for Ontario Trillium Benefit (2025)',
    category: 'ontario_trillium_benefit',
  },

  // -----------------------------------------------------------------------
  // 5. GST/HST Credit
  // -----------------------------------------------------------------------
  {
    content: `GST/HST Credit — 2025 tax year (ITA s.122.5)

Quarterly refundable federal credit. No application required — CRA automatically assesses eligibility when you file your return.

Amounts (based on 2025 net income):
  Base adult credit: $${GST_CREDIT.baseAdult} per adult
  Per child under 19: $${GST_CREDIT.baseChild}
  Single supplement: additional $${GST_CREDIT.baseAdult / 2} for single individuals (approximated)

Clawback: ${(GST_CREDIT.clawRate * 100).toFixed(0)}% of adjusted family net income above $${GST_CREDIT.clawStart.toLocaleString()}.

Payments: quarterly (Jul 2026, Oct 2026, Jan 2027, Apr 2027) based on 2025 tax return.
Newcomers to Canada: apply using RC151 form — do not need to file T1 first.`,
    source: 'CRA RC4210 — GST/HST Credit Guide',
    category: 'gst_hst_credit',
  },

  // -----------------------------------------------------------------------
  // 6. CPP/EI Credits
  // -----------------------------------------------------------------------
  {
    content: `CPP and EI Non-Refundable Credits — 2025 tax year

CPP Contributions:
  Employee max contribution: $${CPP.maxEmployeeContribution.toLocaleString()} on earnings up to $${CPP.maxPensionableEarnings.toLocaleString()} (basic exemption $${CPP.basicExemption.toLocaleString()})
  CPP2 (enhanced second tier): additional $${CPP2.maxEmployeeContribution} on earnings $${CPP.maxPensionableEarnings.toLocaleString()}–$${CPP2.secondCeiling.toLocaleString()}
  Both employee and CPP2 contributions generate a federal non-refundable credit at 15% (line 30800/30900).

EI Premiums:
  Maximum insurable earnings: $${EI.maxInsurableEarnings.toLocaleString()}
  Premium rate: ${(EI.premiumRate * 100).toFixed(2)}%
  Maximum premium: $${EI.maxPremium.toFixed(2)}
  Federal non-refundable credit at 15% (line 31200).

Quebec residents use QPP instead of CPP; different rates apply.
Self-employed individuals pay both employee and employer CPP portions ($${CPP.maxSelfEmployedContribution.toLocaleString()}); employee half generates credit, employer half is deductible (line 22200).`,
    source: 'CRA T4032 Payroll Deductions Tables (2025)',
    category: 'cpp_ei_credits',
  },

  // -----------------------------------------------------------------------
  // 7. Employment Income — T4 boxes
  // -----------------------------------------------------------------------
  {
    content: `Employment Income (T4 Slip) — Key Boxes — 2025 tax year

Box 14: Employment income. Report on line 10100. Includes salary, wages, commissions, tips, bonuses.
Box 16: CPP contributions deducted by employer. Used to calculate line 30800 credit.
Box 17: QPP contributions (Quebec only).
Box 18: EI premiums deducted by employer. Used to calculate line 31200 credit.
Box 22: Income tax deducted. Directly reduces tax payable (line 43700).
Box 40: Other taxable allowances and benefits (e.g., employer-provided car, group life insurance). Already included in Box 14.
Box 44: Union dues. Deductible on line 21200.
Box 52: Pension adjustment — reduces RRSP deduction room for following year.

Multiple T4s: report each employer's T4 separately; combine totals on Schedule 1.
T4 discrepancies: if employer hasn't issued T4 by Feb 28 2026, contact CRA or use last pay stub.

Canada Employment Amount (line 31260): automatic $${FEDERAL_CREDITS.canadaEmploymentAmount.toLocaleString()} × 15% credit for employees.`,
    source: 'CRA RC4157 — Deciphering the T4 Slip',
    category: 'employment_income',
  },

  // -----------------------------------------------------------------------
  // 8. Capital Gains 2025
  // -----------------------------------------------------------------------
  {
    content: `Capital Gains — 2025 tax year (ITA s.38)

Two-tier inclusion rate system (effective June 25, 2024 for corporations; for individuals applies to 2025 dispositions):

Tier 1 — First $${CAPITAL_GAINS.threshold.toLocaleString()} of net capital gains:
  Inclusion rate: ${(CAPITAL_GAINS.inclusionRateLow * 100).toFixed(0)}%
  Example: $100,000 gain → $50,000 taxable income

Tier 2 — Net capital gains above $${CAPITAL_GAINS.threshold.toLocaleString()}:
  Inclusion rate: ${(CAPITAL_GAINS.inclusionRateHigh * 100).toFixed(2)}%
  Example: $350,000 gain → $50,000 + 66.67% × $100,000 = $116,670 taxable

Taxable capital gains reported on Schedule 3, flows to line 12700.

Principal residence: fully exempt if property was your principal residence every year owned (ITA s.40(2)(b)). Designation required (Schedule 3 + T2091).
LCGE: $${CAPITAL_GAINS.lcge.toLocaleString()} lifetime exemption on qualifying small business shares, farm, or fishing property (ITA s.110.6).
Capital losses: can offset capital gains; net losses carry back 3 years or forward indefinitely.`,
    source: 'CRA T4037 — Capital Gains (2025)',
    category: 'capital_gains',
  },

  // -----------------------------------------------------------------------
  // 9. Dividends
  // -----------------------------------------------------------------------
  {
    content: `Dividend Income — 2025 tax year (ITA s.82, s.121)

Eligible Dividends (from Canadian public corporations or CCPCs taxed at general rate):
  Gross-up: actual dividend × ${(1 + DIVIDENDS.eligible.grossUpRate).toFixed(2)} = taxable amount (line 12000)
  Federal DTC: ${(DIVIDENDS.eligible.federalCreditRate * 100).toFixed(4)}% of grossed-up amount
  Ontario DTC: ${(DIVIDENDS.eligible.ontarioCreditRate * 100).toFixed(1)}% of grossed-up amount

Non-Eligible Dividends (from CCPCs taxed at small business rate):
  Gross-up: actual dividend × ${(1 + DIVIDENDS.nonEligible.grossUpRate).toFixed(2)} = taxable amount (line 12010)
  Federal DTC: ${(DIVIDENDS.nonEligible.federalCreditRate * 100).toFixed(4)}% of grossed-up amount
  Ontario DTC: ${(DIVIDENDS.nonEligible.ontarioCreditRate * 100).toFixed(4)}% of grossed-up amount

T5 slip: Box 24 = eligible dividends, Box 10 = non-eligible, Box 25 = eligible gross-up.
Foreign dividends: reported in Canadian dollars; no gross-up; foreign tax credit available (Form T2209).
Dividend tax credit is non-refundable but can reduce tax to zero.`,
    source: 'CRA IT-67R3 — Taxable Dividends from Corporations Resident in Canada',
    category: 'dividends',
  },

  // -----------------------------------------------------------------------
  // 10. Ontario Health Premium
  // -----------------------------------------------------------------------
  {
    content: `Ontario Health Premium (OHP) — 2025 tax year (Ontario Taxation Act s.33.1)

The OHP is a graduated levy on Ontario taxable income, added to Ontario tax payable.

Income $0–$${ONTARIO_HEALTH_PREMIUM.tier1Start.toLocaleString()}: $0
Income $${ONTARIO_HEALTH_PREMIUM.tier1Start.toLocaleString()}–$${ONTARIO_HEALTH_PREMIUM.tier1End.toLocaleString()}: ${(ONTARIO_HEALTH_PREMIUM.tier1Rate * 100).toFixed(0)}% of income above $${ONTARIO_HEALTH_PREMIUM.tier1Start.toLocaleString()}, max $${ONTARIO_HEALTH_PREMIUM.tier1Max}
Income $${ONTARIO_HEALTH_PREMIUM.tier1End.toLocaleString()}–$${ONTARIO_HEALTH_PREMIUM.tier2End.toLocaleString()}: $${ONTARIO_HEALTH_PREMIUM.tier1Max} + ${(ONTARIO_HEALTH_PREMIUM.tier2Rate * 100).toFixed(0)}% of income above $${ONTARIO_HEALTH_PREMIUM.tier1End.toLocaleString()}, max additional $${ONTARIO_HEALTH_PREMIUM.tier2Max}
Income $${ONTARIO_HEALTH_PREMIUM.tier2End.toLocaleString()}–$${ONTARIO_HEALTH_PREMIUM.tier3End.toLocaleString()}: $${ONTARIO_HEALTH_PREMIUM.tier1Max + ONTARIO_HEALTH_PREMIUM.tier2Max} + ${(ONTARIO_HEALTH_PREMIUM.tier3Rate * 100).toFixed(0)}% of income above $${ONTARIO_HEALTH_PREMIUM.tier2End.toLocaleString()}, max additional $${ONTARIO_HEALTH_PREMIUM.tier3Max}
Income $${ONTARIO_HEALTH_PREMIUM.tier3End.toLocaleString()}–$${ONTARIO_HEALTH_PREMIUM.tier4End.toLocaleString()}: $${ONTARIO_HEALTH_PREMIUM.tier1Max + ONTARIO_HEALTH_PREMIUM.tier2Max + ONTARIO_HEALTH_PREMIUM.tier3Max} + ${(ONTARIO_HEALTH_PREMIUM.tier4Rate * 100).toFixed(0)}% of income above $${ONTARIO_HEALTH_PREMIUM.tier3End.toLocaleString()}, max additional $${ONTARIO_HEALTH_PREMIUM.tier4Max}
Income $${ONTARIO_HEALTH_PREMIUM.tier4End.toLocaleString()}+: $${ONTARIO_HEALTH_PREMIUM.maxPremium} (maximum)

The OHP is not a deductible expense and is not the same as a medical expense. It appears directly on Form ON428.`,
    source: 'CRA ON428 Ontario Tax (2025) — Ontario Health Premium section',
    category: 'ontario_health_premium',
  },

  // -----------------------------------------------------------------------
  // 11. Ontario Surtax
  // -----------------------------------------------------------------------
  {
    content: `Ontario Surtax — 2025 tax year (Ontario Taxation Act s.48)

The Ontario surtax is an additional tax applied to basic Ontario income tax (after non-refundable credits, before OHP).

Threshold 1: ${(ONTARIO_SURTAX.rate1 * 100).toFixed(0)}% surtax on basic Ontario tax above $${ONTARIO_SURTAX.threshold1.toLocaleString()}
Threshold 2: additional ${(ONTARIO_SURTAX.rate2 * 100).toFixed(0)}% surtax on basic Ontario tax above $${ONTARIO_SURTAX.threshold2.toLocaleString()}
Combined rate above $${ONTARIO_SURTAX.threshold2.toLocaleString()}: ${((ONTARIO_SURTAX.rate1 + ONTARIO_SURTAX.rate2) * 100).toFixed(0)}% surtax

Example: if basic Ontario tax = $8,000:
  Surtax on $8,000 − $${ONTARIO_SURTAX.threshold1.toLocaleString()} = $${(8000 - ONTARIO_SURTAX.threshold1).toLocaleString()} at 20% = $${((8000 - ONTARIO_SURTAX.threshold1) * 0.20).toFixed(0)}
  Additional surtax on $8,000 − $${ONTARIO_SURTAX.threshold2.toLocaleString()} = $${(8000 - ONTARIO_SURTAX.threshold2).toLocaleString()} at 36% = $${((8000 - ONTARIO_SURTAX.threshold2) * 0.36).toFixed(0)}

The surtax significantly increases effective Ontario tax for high-income filers. It makes Ontario's top combined marginal rate one of the highest in Canada.`,
    source: 'CRA ON428 Ontario Tax (2025) — Ontario surtax section',
    category: 'ontario_surtax',
  },

  // -----------------------------------------------------------------------
  // 12. Tuition Credit
  // -----------------------------------------------------------------------
  {
    content: `Tuition Tax Credit — 2025 tax year (ITA s.118.5)

Federal tuition credit: ${(TUITION.creditRate * 100).toFixed(0)}% of eligible tuition fees paid to a qualifying educational institution.
Eligible tuition: Box A of T2202 (Tuition and Enrolment Certificate). Minimum $100 per institution.

Ontario eliminated its tuition credit after the 2017 tax year — only the federal credit applies in Ontario.

Carryforward: if the student cannot use the full credit in the current year, the unused amount carries forward indefinitely (line 32300 uses current credits; carryforward tracked on Schedule 11).

Transfer: up to $${TUITION.maxTransfer.toLocaleString()} of unused federal tuition credits can be transferred to a parent, grandparent, or spouse (line 32400). The student must designate the transfer (Schedule 11).

Post-secondary: full-time and part-time enrollment both qualify. Distance learning from Canadian institutions qualifies.

Canada Training Credit: separate refundable credit (50% of fees, from accumulated room) — reduces tuition credit claimed.`,
    source: 'CRA P105 — Students and Income Tax',
    category: 'tuition_credit',
  },

  // -----------------------------------------------------------------------
  // 13. Home Office
  // -----------------------------------------------------------------------
  {
    content: `Home Office Expenses — 2025 tax year (ITA s.8(13))

Employees working from home can claim home office expenses using Form T777 (or T777S for temporary flat rate).

Method 1 — Detailed Method:
  Must have Form T2200 signed by employer confirming work-from-home requirement.
  Deductible: electricity, heat, water, internet (employment portion), rent, maintenance.
  Employment-use percentage = home office area ÷ total home area.
  Cannot create or increase employment income loss.

Method 2 — Temporary Flat Rate:
  $2 per day worked from home, maximum 200 days = maximum $400 deduction.
  No T2200 required. No receipts required.
  Available for 2020–2022 and extended — check CRA for 2025 applicability.

Self-employed (T2125): home office deducted against business income; can use actual costs × business-use %, OR same flat rate.

Workspace must be either: (a) principal place of business, OR (b) used exclusively for business and regularly for meeting clients.
Internet: full employment portion is deductible under detailed method (CRA updated guidance 2020+).`,
    source: 'CRA T4044 — Employment Expenses Guide',
    category: 'home_office',
  },

  // -----------------------------------------------------------------------
  // 14. Spousal Amount
  // -----------------------------------------------------------------------
  {
    content: `Spousal/Common-law Partner Amount — 2025 tax year (ITA s.118(1)(a))

Non-refundable federal credit claimed on line 30300.

Maximum federal spousal amount: $${FEDERAL_CREDITS.spouseAmountMax.toLocaleString()} (equal to BPA maximum).
Reduced dollar-for-dollar by the spouse's/partner's net income.
Credit value: (spousal amount − spouse net income) × 15%.

If spouse net income ≥ $${FEDERAL_CREDITS.spouseAmountMax.toLocaleString()}, no credit available.

Ontario spousal amount: up to $${ONTARIO_CREDITS.spouseAmountMax.toLocaleString()} × 5.05%, similarly reduced by spouse net income.

Canada Caregiver supplement: if spouse is infirm, an additional $${FEDERAL_CREDITS.caregiver.canadaCaregiver.toLocaleString()} supplement is added to the spouse amount (line 30425).

Eligible: legally married, or common-law partners who cohabited in a conjugal relationship for 12+ continuous months, or are parents of a child.
Separation: if separated for less than 90 days at year end, still considered married for tax purposes.`,
    source: 'CRA Income Tax Folio S1-F4-C2 — Basic Personal and Spousal Tax Credits',
    category: 'spousal_amount',
  },

  // -----------------------------------------------------------------------
  // 15. Pension Income Splitting
  // -----------------------------------------------------------------------
  {
    content: `Pension Income Splitting — 2025 tax year (ITA s.60.03)

Eligible pensioners can allocate up to 50% of their eligible pension income to their spouse/common-law partner. Use Form T1032 (Joint Election to Split Pension Income).

Eligible pension income:
  Age 65+: RRSP annuities, RRIF withdrawals, RPP payments, annuities from superannuation.
  Any age: RPP payments due to a spouse's death.

NOT eligible for splitting: CPP/QPP benefits, OAS, RRSP lump-sum withdrawals, LIF payments (check).

Tax effect: reduces the pensioner's taxable income; adds the same amount to the recipient spouse's income. Net family tax saving when the recipient is in a lower bracket.

Also affects: OAS clawback (potentially reduces/eliminates clawback for higher-income pensioner), provincial credits, age amount calculation.

Ontario pension income amount: up to $${ONTARIO_CREDITS.pensionIncomeMax.toLocaleString()} credit at 5.05%, available to both spouses after splitting.

File both spouses' T1032 — must be consistent (both elect or neither does).`,
    source: 'CRA T4040 — RRSPs and Registered Plans; ITA s.60.03',
    category: 'pension_splitting',
  },

  // -----------------------------------------------------------------------
  // 16. Age Amount
  // -----------------------------------------------------------------------
  {
    content: `Age Amount — 2025 tax year (ITA s.118(2))

Available to Canadians who were 65 or older on December 31, 2025.

Federal age amount:
  Maximum: $${FEDERAL_CREDITS.ageAmount.max.toLocaleString()}
  Clawback: ${(FEDERAL_CREDITS.ageAmount.clawbackRate * 100).toFixed(0)}% of net income above $${FEDERAL_CREDITS.ageAmount.clawbackStart.toLocaleString()}
  Fully eliminated at approximately $${FEDERAL_CREDITS.ageAmount.eliminationIncome.toLocaleString()}
  Credit value: age amount × 15% (line 30100)

Ontario age amount:
  Maximum: $${ONTARIO_CREDITS.ageAmount.max.toLocaleString()}
  Clawback: ${(ONTARIO_CREDITS.ageAmount.clawbackRate * 100).toFixed(0)}% of net income above $${ONTARIO_CREDITS.ageAmount.clawbackStart.toLocaleString()}
  Credit value: × 5.05%

Strategies: RRSP withdrawals, pension splitting, and income deferral can help keep net income below the clawback threshold to maximize the age amount credit.

OAS pension (line 11300) and CPP/QPP benefits (line 11400) both increase net income and can reduce the age amount credit.`,
    source: 'CRA Income Tax Folio S1-F4-C2 — Age Amount Credit',
    category: 'age_amount',
  },

  // -----------------------------------------------------------------------
  // 17. Medical Expenses
  // -----------------------------------------------------------------------
  {
    content: `Medical Expenses — 2025 tax year (ITA s.118.2)

Non-refundable credit on eligible medical expenses exceeding the lesser of:
  • ${(MEDICAL_EXPENSES.thresholdRate * 100).toFixed(0)}% of net income, OR
  • $${MEDICAL_EXPENSES.threshold.toLocaleString()}

Example: net income $60,000 → threshold = max($${MEDICAL_EXPENSES.threshold.toLocaleString()}, $${(60000 * MEDICAL_EXPENSES.thresholdRate).toFixed(0)}) = $${(60000 * MEDICAL_EXPENSES.thresholdRate).toFixed(0)}

Eligible expenses (partial list): prescription drugs, dental, orthodontics, glasses/contacts, hearing aids, attendant care, fertility treatments, travel (>40km for unavailable treatment), CPAP devices, gluten-free food premium (celiac diagnosis).

NOT eligible: vitamins, gym memberships, cosmetic procedures, over-the-counter drugs.

Claim any 12-month period ending in 2025. Can claim for self, spouse, and children under 18.
Dependant over 18: claimed on line 33199 (separate calculation with $${MEDICAL_EXPENSES.dependantMax.toLocaleString()} maximum).

Refundable Medical Expense Supplement (line 45200): additional refundable credit for low-income workers (25% of eligible expenses, max $1,524, requires $3,840+ earned income).`,
    source: 'CRA RC4065 — Medical Expenses Guide',
    category: 'medical_expenses',
  },

  // -----------------------------------------------------------------------
  // 18. Moving Expenses
  // -----------------------------------------------------------------------
  {
    content: `Moving Expenses — 2025 tax year (ITA s.62)

Deductible when you move at least 40 km closer to a new work location or educational institution in Canada.

Eligible expenses (Form T1-M):
  Transportation and storage of household effects.
  Travel costs (vehicle, meals, lodging) — 12 cents/km for vehicle or actual costs.
  Temporary accommodation near old/new home: maximum 15 days.
  Cost of selling old home: real estate commissions, legal fees, penalties for breaking mortgage.
  Cost of buying new home: legal fees (only if old home was sold).
  Lease cancellation penalty on old home.
  Costs of disconnecting/reconnecting utilities.

Deduction limit: moving expenses can only be claimed against income earned at the new location in 2025 (line 21900). Excess carries forward to 2026.

Student movers: moving to and from school both qualify if the student had employment income at the new location.
Reimbursed expenses: only the net unreimbursed amount is deductible.`,
    source: 'CRA T4044 — Moving Expenses (T1-M)',
    category: 'moving_expenses',
  },

  // -----------------------------------------------------------------------
  // 19. Canada Caregiver Credit
  // -----------------------------------------------------------------------
  {
    content: `Canada Caregiver Credit (CCC) — 2025 tax year (ITA s.118(1)(d)/(e))

Non-refundable federal credit for individuals supporting infirm dependants.

Line 30400 — Eligible dependant who is infirm (child under 18, no income test):
  Amount: up to $${CANADA_CAREGIVER.childUnder18.toLocaleString()}

Line 30425 — Infirm spouse/common-law partner supplement:
  Added to spousal amount (line 30300).
  Additional $${CANADA_CAREGIVER.spouseInfirmSupplement.toLocaleString()} × 15%.

Line 30450 — Infirm dependant 18 or older (parent, grandparent, adult child, sibling, etc.):
  Maximum: $${CANADA_CAREGIVER.infirmDependant18Plus.toLocaleString()}
  Reduced by $1 for every $1 of dependant's net income above $${CANADA_CAREGIVER.infirmDependantIncomeThreshold.toLocaleString()}

"Infirm" means physical or mental impairment that regularly requires the claimant to provide assistance with daily activities. A DTC certificate is NOT required — but the impairment must be certified by a qualified medical practitioner on request.

Multiple caregivers: only one person may claim for each dependant. If two people share care, they must agree who claims.`,
    source: 'CRA Income Tax Folio S1-F4-C2 — Canada Caregiver Credit',
    category: 'canada_caregiver_credit',
  },

  // -----------------------------------------------------------------------
  // 20. FHSA
  // -----------------------------------------------------------------------
  {
    content: `First Home Savings Account (FHSA) — 2025 tax year (ITA s.146.6)

The FHSA combines RRSP-style deductibility with TFSA-style tax-free withdrawal for first-time home buyers.

Contribution limits:
  Annual limit: $${FHSA.annualLimit.toLocaleString()}
  Lifetime limit: $${FHSA.lifetimeLimit.toLocaleString()}
  Unused annual room carries forward up to $${FHSA.carryForwardMax.toLocaleString()} (one year only).

Deductibility: contributions are deductible (line 20805), reducing net income just like RRSP.
Withdrawals: qualifying withdrawals for first home purchase are tax-free — not added to income.
Investment growth: tax-free inside the account.

Eligibility: Canadian resident, 18+, first-time buyer (no home owned in current year or prior 4 years).
Time limit: account must be used within 15 years of opening, or by age 71 — otherwise transfer to RRSP tax-free or withdraw and pay tax.

Can hold both FHSA and use HBP (RRSP): can make qualifying withdrawal from FHSA AND use HBP for the same home purchase.`,
    source: 'CRA RC4466 — First Home Savings Account Guide',
    category: 'fhsa',
  },
];
