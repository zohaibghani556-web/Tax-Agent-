/**
 * Tests for src/lib/ai/assessment.ts
 *
 * The assessment parser is in the critical path: Claude embeds structured JSON
 * inside conversational responses and this module extracts it. Bugs here cause
 * the TaxProfile to not update, which silently breaks the auto-pipeline
 * (chat → engine → results).
 */

import { describe, it, expect } from 'vitest';
import {
  extractProfileUpdate,
  mergeProfileUpdate,
  calculateAssessmentProgress,
} from './assessment';
import type { TaxProfile } from '../tax-engine/types';

// ── Shared fixture ─────────────────────────────────────────────────────────

const baseProfile: TaxProfile = {
  id: 'p1',
  userId: 'u1',
  taxYear: 2025,
  legalName: '',
  dateOfBirth: '',
  maritalStatus: 'single',
  province: 'ON',
  residencyStatus: 'citizen',
  residencyStartDate: undefined,
  dependants: [],
  assessmentComplete: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ── extractProfileUpdate ───────────────────────────────────────────────────

describe('extractProfileUpdate', () => {
  it('returns null when no structured block is present', () => {
    expect(extractProfileUpdate('Great, what is your province?')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractProfileUpdate('')).toBeNull();
  });

  it('extracts legalName from a valid block', () => {
    const response = `Sure! Let me note that down.
\`\`\`tax-profile-update
{ "legalName": "Jane Doe" }
\`\`\`
What is your date of birth?`;
    const update = extractProfileUpdate(response);
    expect(update).not.toBeNull();
    expect(update?.legalName).toBe('Jane Doe');
  });

  it('trims whitespace from legalName', () => {
    const response = '```tax-profile-update\n{ "legalName": "  John Smith  " }\n```';
    expect(extractProfileUpdate(response)?.legalName).toBe('John Smith');
  });

  it('extracts a valid ISO date of birth', () => {
    const response = '```tax-profile-update\n{ "dateOfBirth": "1985-03-22" }\n```';
    expect(extractProfileUpdate(response)?.dateOfBirth).toBe('1985-03-22');
  });

  it('rejects an invalid date format', () => {
    const response = '```tax-profile-update\n{ "dateOfBirth": "March 22, 1985" }\n```';
    const update = extractProfileUpdate(response);
    expect(update?.dateOfBirth).toBeUndefined();
  });

  it('rejects a non-existent date (Feb 30)', () => {
    const response = '```tax-profile-update\n{ "dateOfBirth": "1990-02-30" }\n```';
    const update = extractProfileUpdate(response);
    expect(update?.dateOfBirth).toBeUndefined();
  });

  it('extracts valid marital status', () => {
    const statuses = ['single', 'married', 'common-law', 'separated', 'divorced', 'widowed'];
    for (const status of statuses) {
      const response = `\`\`\`tax-profile-update\n{ "maritalStatus": "${status}" }\n\`\`\``;
      expect(extractProfileUpdate(response)?.maritalStatus).toBe(status);
    }
  });

  it('ignores invalid marital status values', () => {
    const response = '```tax-profile-update\n{ "maritalStatus": "it\'s complicated" }\n```';
    const update = extractProfileUpdate(response);
    expect(update?.maritalStatus).toBeUndefined();
  });

  it('extracts valid residency status', () => {
    const response = '```tax-profile-update\n{ "residencyStatus": "newcomer", "residencyStartDate": "2025-04-01" }\n```';
    const update = extractProfileUpdate(response);
    expect(update?.residencyStatus).toBe('newcomer');
    expect(update?.residencyStartDate).toBe('2025-04-01');
  });

  it('extracts assessmentComplete: true', () => {
    const response = '```tax-profile-update\n{ "assessmentComplete": true }\n```';
    expect(extractProfileUpdate(response)?.assessmentComplete).toBe(true);
  });

  it('extracts dependants array with valid entries', () => {
    const response = `\`\`\`tax-profile-update
{
  "dependants": [
    {
      "name": "Emma Smith",
      "dateOfBirth": "2018-06-15",
      "relationship": "child",
      "netIncome": 0,
      "hasDisability": false,
      "inFullTimeCare": false
    }
  ]
}
\`\`\``;
    const update = extractProfileUpdate(response);
    expect(update?.dependants).toHaveLength(1);
    expect(update?.dependants?.[0].name).toBe('Emma Smith');
    expect(update?.dependants?.[0].relationship).toBe('child');
  });

  it('normalises unknown dependant relationship to "other"', () => {
    const response = `\`\`\`tax-profile-update
{ "dependants": [{ "name": "Bob", "relationship": "roommate", "dateOfBirth": "1990-01-01" }] }
\`\`\``;
    const update = extractProfileUpdate(response);
    expect(update?.dependants?.[0].relationship).toBe('other');
  });

  it('returns null for malformed JSON inside the block', () => {
    const response = '```tax-profile-update\n{ legalName: missing quotes }\n```';
    expect(extractProfileUpdate(response)).toBeNull();
  });

  it('extracts a full multi-field update', () => {
    const response = `\`\`\`tax-profile-update
{
  "legalName": "Alice Nguyen",
  "dateOfBirth": "1992-07-10",
  "maritalStatus": "married",
  "residencyStatus": "citizen",
  "assessmentComplete": false
}
\`\`\``;
    const update = extractProfileUpdate(response);
    expect(update?.legalName).toBe('Alice Nguyen');
    expect(update?.dateOfBirth).toBe('1992-07-10');
    expect(update?.maritalStatus).toBe('married');
    expect(update?.residencyStatus).toBe('citizen');
    expect(update?.assessmentComplete).toBe(false);
  });
});

// ── mergeProfileUpdate ─────────────────────────────────────────────────────

describe('mergeProfileUpdate', () => {
  it('merges new fields into the existing profile', () => {
    const update = { legalName: 'Jane Doe', maritalStatus: 'married' as const };
    const merged = mergeProfileUpdate(baseProfile, update);
    expect(merged.legalName).toBe('Jane Doe');
    expect(merged.maritalStatus).toBe('married');
  });

  it('preserves unmodified fields', () => {
    const update = { legalName: 'Alice' };
    const merged = mergeProfileUpdate({ ...baseProfile, residencyStatus: 'newcomer' }, update);
    expect(merged.residencyStatus).toBe('newcomer');
  });

  it('replaces dependants array (not appends)', () => {
    const existing = { ...baseProfile, dependants: [{ name: 'Old Child', dateOfBirth: '2010-01-01', relationship: 'child' as const, netIncome: 0, hasDisability: false, inFullTimeCare: false }] };
    const update = { dependants: [{ name: 'New Child', dateOfBirth: '2015-06-01', relationship: 'child' as const, netIncome: 0, hasDisability: false, inFullTimeCare: false }] };
    const merged = mergeProfileUpdate(existing, update);
    expect(merged.dependants).toHaveLength(1);
    expect(merged.dependants[0].name).toBe('New Child');
  });

  it('sets updatedAt to a recent ISO timestamp', () => {
    const before = Date.now();
    const merged = mergeProfileUpdate(baseProfile, { legalName: 'X' });
    const mergedTime = new Date(merged.updatedAt).getTime();
    expect(mergedTime).toBeGreaterThanOrEqual(before);
  });
});

// ── calculateAssessmentProgress ────────────────────────────────────────────

describe('calculateAssessmentProgress', () => {
  it('returns 0% for a completely empty profile', () => {
    const result = calculateAssessmentProgress({});
    expect(result.percent).toBe(0);
    expect(result.completedSections).toHaveLength(0);
  });

  it('returns 100% when all sections are complete', () => {
    const complete: Partial<TaxProfile> = {
      legalName: 'Jane',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'single',
      residencyStatus: 'citizen',
      dependants: [],
      assessmentComplete: true,
    };
    const result = calculateAssessmentProgress(complete);
    expect(result.percent).toBe(100);
    expect(result.missingSections).toHaveLength(0);
  });

  it('counts personal-info as complete only when all three fields present', () => {
    // Only name — not complete yet
    let r = calculateAssessmentProgress({ legalName: 'Jane' });
    expect(r.completedSections).not.toContain('Personal info');

    // All three — complete
    r = calculateAssessmentProgress({ legalName: 'Jane', dateOfBirth: '1990-01-01', maritalStatus: 'single' });
    expect(r.completedSections).toContain('Personal info');
  });

  it('counts residency as complete when residencyStatus is set', () => {
    const r = calculateAssessmentProgress({ residencyStatus: 'permanent-resident' });
    expect(r.completedSections).toContain('Residency');
  });

  it('counts dependants as complete when the array is present (even empty)', () => {
    const r = calculateAssessmentProgress({ dependants: [] });
    expect(r.completedSections).toContain('Dependants');
  });

  it('lists missing sections correctly for a partial profile', () => {
    const r = calculateAssessmentProgress({
      legalName: 'Jane',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'single',
      residencyStatus: 'citizen',
    });
    expect(r.completedSections).toContain('Personal info');
    expect(r.completedSections).toContain('Residency');
    expect(r.missingSections).toContain('Dependants');
    expect(r.missingSections).toContain('Assessment complete');
    expect(r.percent).toBe(50);
  });
});
