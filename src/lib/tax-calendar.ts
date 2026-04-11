/**
 * Tax Calendar — 2026 Canadian/Ontario key dates (for the 2025 tax year).
 *
 * All dates are for the 2025 filing season (deadlines in 2026).
 * Sources: CRA General Income Tax and Benefit Guide, ITA s.150(1)(d), s.156.
 */

export interface TaxEvent {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  title: string;
  description: string;
  /** 'deadline' = hard CRA date; 'tip' = advisory; 'payment' = money owed */
  type: 'deadline' | 'tip' | 'payment';
  /** CRA line or form reference, if applicable */
  reference?: string;
  /** Days until or since this event (computed at runtime) */
  daysUntil?: number;
}

export const TAX_CALENDAR_2025: TaxEvent[] = [
  {
    date: '2026-01-01',
    title: 'T4/T5 slips issued from Jan 1',
    description: 'Employers and financial institutions begin issuing T4, T5, and other tax slips. Expect your slips by the last day of February.',
    type: 'tip',
  },
  {
    date: '2026-01-20',
    title: 'Q4 2025 instalment due (if applicable)',
    description: 'Fourth quarterly income tax instalment for 2025 if you pay by instalments (no employer withholding). ITA s.156.',
    type: 'payment',
    reference: 'ITA s.156',
  },
  {
    date: '2026-02-28',
    title: 'RRSP contribution deadline',
    description: 'Last day to make RRSP contributions deductible on your 2025 return. First 60 days of 2026 count for 2025.',
    type: 'deadline',
    reference: 'ITA s.146',
  },
  {
    date: '2026-02-28',
    title: 'T4 / T5 slips must be issued',
    description: 'CRA requires employers and payers to issue all T4, T5, T3, T4A, and T5013 slips by the last day of February.',
    type: 'tip',
  },
  {
    date: '2026-03-01',
    title: 'FHSA contribution deadline',
    description: 'Last day to contribute to your First Home Savings Account for the 2025 tax year.',
    type: 'deadline',
    reference: 'ITA s.146.6',
  },
  {
    date: '2026-04-30',
    title: 'T1 filing deadline',
    description: 'Last day to file your 2025 personal income tax return without penalty (ITA s.150). Late filing attracts 5% + 1%/month penalty on balance owing.',
    type: 'deadline',
    reference: 'ITA s.150(1)(d)',
  },
  {
    date: '2026-04-30',
    title: 'Balance owing due',
    description: 'Any amount you owe for 2025 must be paid by April 30 to avoid arrears interest (currently 9% compound daily).',
    type: 'payment',
    reference: 'ITA s.156.1',
  },
  {
    date: '2026-06-15',
    title: 'Self-employment filing deadline',
    description: 'Extended filing deadline if you or your spouse/CL partner had self-employment income. Balance owing is still due April 30.',
    type: 'deadline',
    reference: 'ITA s.150(1)(d)(ii)',
  },
];

/**
 * Returns tax events with `daysUntil` populated relative to today.
 * Events more than 365 days in the past are excluded.
 */
export function getUpcomingEvents(today: Date = new Date()): TaxEvent[] {
  const todayMs = today.setHours(0, 0, 0, 0);
  return TAX_CALENDAR_2025
    .map((event) => {
      const eventMs = new Date(event.date).setHours(0, 0, 0, 0);
      const daysUntil = Math.round((eventMs - todayMs) / (1000 * 60 * 60 * 24));
      return { ...event, daysUntil };
    })
    .filter((e) => (e.daysUntil ?? 0) >= -30) // keep events up to 30 days past
    .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));
}
