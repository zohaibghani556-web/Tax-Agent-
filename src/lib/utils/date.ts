import { DEADLINES, TAX_YEAR } from '@/lib/tax-engine/constants';

export function getAge(dateOfBirth: string, asOfDate = `${TAX_YEAR}-12-31`): number {
  const dob = new Date(dateOfBirth);
  const asOf = new Date(asOfDate);
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function isSenior(dateOfBirth: string): boolean {
  return getAge(dateOfBirth) >= 65;
}

export function isFilingDeadlinePassed(): boolean {
  return new Date() > new Date(DEADLINES.filingDeadline);
}

/** Number of days the person was a Canadian resident in the tax year (for newcomers) */
export function daysResident(entryDate: string): number {
  const entry = new Date(entryDate);
  const yearEnd = new Date(`${TAX_YEAR}-12-31`);
  const yearStart = new Date(`${TAX_YEAR}-01-01`);
  const start = entry > yearStart ? entry : yearStart;
  const diffMs = yearEnd.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

/** Pro-rate an amount for newcomers (days resident / 365) */
export function proRateForNewcomer(amount: number, entryDate: string): number {
  const days = daysResident(entryDate);
  return Math.round((amount * days) / 365 * 100) / 100;
}
