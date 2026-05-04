/**
 * TaxAgent.ai — CPA Review Queue Types
 *
 * Status model for the firm review workflow. A review file wraps a
 * TaxFileGraph and tracks its journey from preparation through filing.
 */

// ============================================================
// STATUS MODEL
// ============================================================

/**
 * Review file status — stored in DB, drives the queue UI.
 *
 * - in_prep: preparer is gathering docs / running calc
 * - in_review: preparer marked ready, reviewer is checking
 * - approved: reviewer signed off (only if 0 error-level warnings)
 * - filed: transmitted via external software (TaxCycle, ProFile, etc.)
 * - needs_info: reviewer requests more info from client
 */
export type ReviewFileStatus =
  | 'in_prep'
  | 'in_review'
  | 'approved'
  | 'filed'
  | 'needs_info';

/** All valid statuses, useful for runtime validation. */
export const REVIEW_FILE_STATUSES: readonly ReviewFileStatus[] = [
  'in_prep',
  'in_review',
  'approved',
  'filed',
  'needs_info',
] as const;

// ============================================================
// VALID STATUS TRANSITIONS
// ============================================================

/**
 * Hard rules for status transitions. Key = current status, value = allowed next statuses.
 *
 * - in_prep → in_review (preparer marks ready)
 * - in_review → approved (reviewer signs off, only if 0 error-level warnings)
 * - in_review → needs_info (reviewer requests more from client)
 * - needs_info → in_prep (new info received)
 * - approved → filed (after transmit via external software)
 * - NO backwards from approved without explicit override
 */
export const VALID_TRANSITIONS: Record<ReviewFileStatus, readonly ReviewFileStatus[]> = {
  in_prep: ['in_review'],
  in_review: ['approved', 'needs_info'],
  needs_info: ['in_prep'],
  approved: ['filed'],
  filed: [],
} as const;

/**
 * Check whether a status transition is allowed.
 */
export function isValidTransition(from: ReviewFileStatus, to: ReviewFileStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ============================================================
// DATA TYPES
// ============================================================

export interface ReviewFile {
  id: string;
  profileId: string;
  taxYear: number;
  status: ReviewFileStatus;
  assignedPreparerId: string | null;
  assignedReviewerId: string | null;
  exceptionCount: number;
  readinessScore: number;
  reviewerApprovedAt: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Node types that a review note can be attached to. */
export type ReviewNoteNodeType = 'slip' | 'extraction' | 'calculation' | 'general';

export interface ReviewNote {
  id: string;
  reviewFileId: string;
  userId: string;
  nodeType: ReviewNoteNodeType | null;
  nodeId: string | null;
  content: string;
  createdAt: string;
}

// ============================================================
// API PAYLOADS
// ============================================================

/** PATCH /api/review-queue/[id] body */
export interface UpdateReviewFilePayload {
  status?: ReviewFileStatus;
  assignedPreparerId?: string | null;
  assignedReviewerId?: string | null;
  reviewerNotes?: string | null;
}

/** POST /api/review-queue/[id]/notes body */
export interface CreateReviewNotePayload {
  nodeType?: ReviewNoteNodeType | null;
  nodeId?: string | null;
  content: string;
}
