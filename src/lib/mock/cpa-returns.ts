// Mock CPA client returns — replace with real Supabase query later.
// SIN: only last-3 stored here; never expose full SIN in mock or logs.

export type ReturnStatus =
  | 'Ready to review'
  | 'Flagged'
  | 'Client action'
  | 'In progress'
  | 'Filed';

export type FilterKey = 'all' | 'ready' | 'flagged' | 'action' | 'filed';

export interface SlipRecord {
  type: string;
  state: string;
}

export interface FlagDetail {
  title: string;
  body: string;
}

export interface IncomeBreakdown {
  t4: number;
  t5: number;
  se: number;
}

export interface ClientReturn {
  id: string;
  name: string;
  initials: string;
  /** Last 3 digits of SIN only — displayed as ••• ••• XXX */
  sinSuffix: string;
  type: string;
  status: ReturnStatus;
  /** Short flag labels for the chips column */
  flags: string[];
  income: number;
  /** Positive = refund, negative = balance owing */
  refund: number;
  updatedLabel: string;
  breakdown: IncomeBreakdown;
  slips: SlipRecord[];
  flagDetails: FlagDetail[];
}

export const MOCK_RETURNS: ClientReturn[] = [
  {
    id: 'c1',
    name: 'Priya Patel',
    initials: 'PP',
    sinSuffix: '483',
    type: 'Joint (2 returns)',
    status: 'Flagged',
    flags: ['T5 mismatch', 'Missing T2202'],
    income: 94500,
    refund: 2180,
    updatedLabel: '12 min ago',
    breakdown: { t4: 78000, t5: 1500, se: 15000 },
    slips: [
      { type: 'T4', state: 'Extracted' },
      { type: 'T5', state: 'Mismatch' },
      { type: 'T2202', state: 'Pending' },
    ],
    flagDetails: [
      {
        title: 'T5 Box 13 disagrees with CRA CDI record',
        body: 'Client reports $1,500; CRA pre-fill shows $1,820. Reconcile before filing.',
      },
      {
        title: 'T2202 not uploaded',
        body: 'Client mentioned tuition in assessment but no T2202 yet. $650 credit estimated.',
      },
    ],
  },
  {
    id: 'c2',
    name: 'Marcus Chen',
    initials: 'MC',
    sinSuffix: '217',
    type: 'Simple · T4 only',
    status: 'Ready to review',
    flags: [],
    income: 62400,
    refund: 947,
    updatedLabel: '1 h ago',
    breakdown: { t4: 62400, t5: 0, se: 0 },
    slips: [{ type: 'T4', state: 'Extracted' }],
    flagDetails: [],
  },
  {
    id: 'c3',
    name: 'Fatima Al-Sayed',
    initials: 'FA',
    sinSuffix: '912',
    type: 'Newcomer · 9 mo ON',
    status: 'Client action',
    flags: ['SIN unverified'],
    income: 41800,
    refund: 3120,
    updatedLabel: '3 h ago',
    breakdown: { t4: 41800, t5: 0, se: 0 },
    slips: [{ type: 'T4', state: 'Extracted' }],
    flagDetails: [
      {
        title: 'SIN not yet verified with CRA',
        body: "Client is new to Canada. Ask them to confirm their permanent SIN before NETFILE.",
      },
    ],
  },
  {
    id: 'c4',
    name: 'Jordan Ng',
    initials: 'JN',
    sinSuffix: '554',
    type: 'Gig · T4 + SE',
    status: 'In progress',
    flags: ['Missing receipts'],
    income: 51200,
    refund: -842,
    updatedLabel: 'yesterday',
    breakdown: { t4: 21000, t5: 0, se: 30200 },
    slips: [
      { type: 'T4', state: 'Extracted' },
      { type: 'T2125', state: 'Draft' },
    ],
    flagDetails: [
      {
        title: 'Expense receipts under category threshold',
        body: 'Claimed $4,100 in meals & entertainment on $30K self-employment income. Flag for review.',
      },
    ],
  },
  {
    id: 'c5',
    name: 'Elena Rossi & David Kim',
    initials: 'ER',
    sinSuffix: '076',
    type: 'Family · 4 returns',
    status: 'Ready to review',
    flags: ['RRSP transfer'],
    income: 178900,
    refund: 5420,
    updatedLabel: 'yesterday',
    breakdown: { t4: 168000, t5: 2900, se: 8000 },
    slips: [
      { type: 'T4', state: 'Extracted' },
      { type: 'T5', state: 'Extracted' },
      { type: 'T4A', state: 'Extracted' },
    ],
    flagDetails: [
      {
        title: 'Suggested RRSP transfer optimization',
        body: 'Shifting $3,400 of RRSP to spouse saves $612 in household tax. Confirm with client.',
      },
    ],
  },
  {
    id: 'c6',
    name: 'Amara Okonkwo',
    initials: 'AO',
    sinSuffix: '331',
    type: 'Simple · T4 only',
    status: 'Filed',
    flags: [],
    income: 58400,
    refund: 1240,
    updatedLabel: 'Apr 2',
    breakdown: { t4: 58400, t5: 0, se: 0 },
    slips: [{ type: 'T4', state: 'Extracted' }],
    flagDetails: [],
  },
];
