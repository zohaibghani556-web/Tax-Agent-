/**
 * TaxAgent.ai — Assessment Response Parser
 *
 * Extracts structured TaxProfile updates from Claude's conversational responses.
 * Claude embeds a `tax-profile-update` JSON block when it has learned new profile data.
 */

import type { TaxProfile, MaritalStatus, ResidencyStatus, Dependant } from '../tax-engine/types';

// ============================================================
// EXTRACTION
// ============================================================

/**
 * Extracts a partial TaxProfile update from Claude's response text.
 * Returns null if no structured block is present.
 */
export function extractProfileUpdate(
  responseText: string
): Partial<TaxProfile> | null {
  // Match ```tax-profile-update ... ``` blocks
  const match = responseText.match(
    /```tax-profile-update\s*([\s\S]*?)```/
  );

  if (!match) return null;

  try {
    const raw = JSON.parse(match[1].trim()) as Record<string, unknown>;
    return parseProfileFields(raw);
  } catch {
    // Malformed JSON from the model — silently ignore
    return null;
  }
}

// ============================================================
// FIELD PARSERS
// ============================================================

function parseProfileFields(raw: Record<string, unknown>): Partial<TaxProfile> {
  const update: Partial<TaxProfile> = {};

  if (typeof raw.legalName === 'string') {
    update.legalName = raw.legalName.trim();
  }

  if (typeof raw.dateOfBirth === 'string' && isValidDate(raw.dateOfBirth)) {
    update.dateOfBirth = raw.dateOfBirth;
  }

  if (isMaritalStatus(raw.maritalStatus)) {
    update.maritalStatus = raw.maritalStatus;
  }

  if (isResidencyStatus(raw.residencyStatus)) {
    update.residencyStatus = raw.residencyStatus;
  }

  if (
    typeof raw.residencyStartDate === 'string' &&
    isValidDate(raw.residencyStartDate)
  ) {
    update.residencyStartDate = raw.residencyStartDate;
  }

  if (Array.isArray(raw.dependants)) {
    update.dependants = raw.dependants
      .filter(isDependantLike)
      .map(parseDependant);
  }

  if (typeof raw.assessmentComplete === 'boolean') {
    update.assessmentComplete = raw.assessmentComplete;
  }

  return update;
}

// ============================================================
// GUARDS AND VALIDATORS
// ============================================================

const MARITAL_STATUSES: MaritalStatus[] = [
  'single',
  'married',
  'common-law',
  'separated',
  'divorced',
  'widowed',
];

function isMaritalStatus(v: unknown): v is MaritalStatus {
  return typeof v === 'string' && (MARITAL_STATUSES as string[]).includes(v);
}

const RESIDENCY_STATUSES: ResidencyStatus[] = [
  'citizen',
  'permanent-resident',
  'deemed-resident',
  'newcomer',
  'non-resident',
];

function isResidencyStatus(v: unknown): v is ResidencyStatus {
  return typeof v === 'string' && (RESIDENCY_STATUSES as string[]).includes(v);
}

function isValidDate(s: string): boolean {
  // Expect ISO format YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function isDependantLike(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseDependant(raw: Record<string, unknown>): Dependant {
  const relationship = ['child', 'spouse', 'parent', 'other'].includes(
    String(raw.relationship)
  )
    ? (raw.relationship as Dependant['relationship'])
    : 'other';

  return {
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    dateOfBirth:
      typeof raw.dateOfBirth === 'string' && isValidDate(raw.dateOfBirth)
        ? raw.dateOfBirth
        : '',
    relationship,
    netIncome: typeof raw.netIncome === 'number' ? raw.netIncome : 0,
    hasDisability: typeof raw.hasDisability === 'boolean' ? raw.hasDisability : false,
    inFullTimeCare:
      typeof raw.inFullTimeCare === 'boolean' ? raw.inFullTimeCare : false,
  };
}

// ============================================================
// PROFILE MERGE
// ============================================================

/**
 * Merges a partial update into an existing TaxProfile.
 * Arrays are replaced (not appended) to keep Claude in control of the full list.
 */
export function mergeProfileUpdate(
  current: TaxProfile,
  update: Partial<TaxProfile>
): TaxProfile {
  return {
    ...current,
    ...update,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// PROGRESS CALCULATION
// ============================================================

export interface AssessmentProgress {
  /** 0–100 */
  percent: number;
  completedSections: string[];
  missingSections: string[];
}

/**
 * Estimates how complete a TaxProfile is for display in the UI progress bar.
 * Based on required fields for a minimal Ontario T1 return.
 */
export function calculateAssessmentProgress(
  profile: Partial<TaxProfile>
): AssessmentProgress {
  const sections: { name: string; complete: boolean }[] = [
    {
      name: 'Personal info',
      complete: Boolean(profile.legalName && profile.dateOfBirth && profile.maritalStatus),
    },
    {
      name: 'Residency',
      complete: Boolean(profile.residencyStatus),
    },
    {
      name: 'Dependants',
      // Either they have none (empty array) or they've been populated
      complete: Array.isArray(profile.dependants),
    },
    {
      name: 'Assessment complete',
      complete: profile.assessmentComplete === true,
    },
  ];

  const completed = sections.filter((s) => s.complete);
  const missing = sections.filter((s) => !s.complete);

  return {
    percent: Math.round((completed.length / sections.length) * 100),
    completedSections: completed.map((s) => s.name),
    missingSections: missing.map((s) => s.name),
  };
}
