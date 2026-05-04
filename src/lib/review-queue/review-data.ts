/**
 * TaxAgent.ai — Review Queue Supabase Helpers
 *
 * CRUD operations for review_files and review_notes tables.
 * All queries go through RLS via the authenticated Supabase client.
 * Functions log errors and return null/[] — never throw to the UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import type {
  ReviewFile,
  ReviewFileStatus,
  ReviewNote,
  ReviewNoteNodeType,
} from './types';

// ============================================================
// ROW → TYPE MAPPERS
// ============================================================

function rowToReviewFile(row: Record<string, unknown>): ReviewFile {
  return {
    id: row.id as string,
    profileId: row.profile_id as string,
    taxYear: row.tax_year as number,
    status: row.status as ReviewFileStatus,
    assignedPreparerId: (row.assigned_preparer_id as string | null) ?? null,
    assignedReviewerId: (row.assigned_reviewer_id as string | null) ?? null,
    exceptionCount: (row.exception_count as number) ?? 0,
    readinessScore: (row.readiness_score as number) ?? 0,
    reviewerApprovedAt: (row.reviewer_approved_at as string | null) ?? null,
    reviewerNotes: (row.reviewer_notes as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? '',
    updatedAt: (row.updated_at as string | null) ?? '',
  };
}

function rowToReviewNote(row: Record<string, unknown>): ReviewNote {
  return {
    id: row.id as string,
    reviewFileId: row.review_file_id as string,
    userId: row.user_id as string,
    nodeType: (row.node_type as ReviewNoteNodeType | null) ?? null,
    nodeId: (row.node_id as string | null) ?? null,
    content: row.content as string,
    createdAt: (row.created_at as string | null) ?? '',
  };
}

// ============================================================
// REVIEW FILES — QUERIES
// ============================================================

/**
 * List all review files visible to the current user (via RLS).
 * Returns files where user is owner, preparer, or reviewer.
 */
export async function listReviewFiles(
  supabase: SupabaseClient,
  filters?: {
    status?: ReviewFileStatus;
    taxYear?: number;
    assignedToMe?: boolean;
    userId?: string;
  },
): Promise<ReviewFile[]> {
  let query = supabase
    .from('review_files')
    .select('*')
    .order('updated_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.taxYear) {
    query = query.eq('tax_year', filters.taxYear);
  }
  if (filters?.assignedToMe && filters?.userId) {
    // Files where user is preparer OR reviewer
    query = query.or(
      `assigned_preparer_id.eq.${filters.userId},assigned_reviewer_id.eq.${filters.userId}`,
    );
  }

  const { data, error } = await query;

  if (error) {
    log('error', 'review-data:list-failed', { error: error.message });
    return [];
  }

  return (data as Array<Record<string, unknown>>).map(rowToReviewFile);
}

/**
 * Get a single review file by ID.
 */
export async function getReviewFile(
  supabase: SupabaseClient,
  reviewFileId: string,
): Promise<ReviewFile | null> {
  const { data, error } = await supabase
    .from('review_files')
    .select('*')
    .eq('id', reviewFileId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      log('error', 'review-data:get-failed', { error: error.message });
    }
    return null;
  }

  return rowToReviewFile(data as Record<string, unknown>);
}

/**
 * Get the review file for a specific profile + tax year (unique constraint).
 */
export async function getReviewFileByProfile(
  supabase: SupabaseClient,
  profileId: string,
  taxYear: number,
): Promise<ReviewFile | null> {
  const { data, error } = await supabase
    .from('review_files')
    .select('*')
    .eq('profile_id', profileId)
    .eq('tax_year', taxYear)
    .maybeSingle();

  if (error || !data) return null;

  return rowToReviewFile(data as Record<string, unknown>);
}

// ============================================================
// REVIEW FILES — MUTATIONS
// ============================================================

/**
 * Create a new review file for a profile + tax year.
 * Returns null if one already exists (unique constraint).
 */
export async function createReviewFile(
  supabase: SupabaseClient,
  profileId: string,
  taxYear: number,
  opts?: {
    assignedPreparerId?: string;
    assignedReviewerId?: string;
    exceptionCount?: number;
    readinessScore?: number;
  },
): Promise<ReviewFile | null> {
  const { data, error } = await supabase
    .from('review_files')
    .insert({
      profile_id: profileId,
      tax_year: taxYear,
      status: 'in_prep',
      assigned_preparer_id: opts?.assignedPreparerId ?? null,
      assigned_reviewer_id: opts?.assignedReviewerId ?? null,
      exception_count: opts?.exceptionCount ?? 0,
      readiness_score: opts?.readinessScore ?? 0,
    })
    .select('*')
    .single();

  if (error || !data) {
    log('error', 'review-data:create-failed', { error: error?.message });
    return null;
  }

  return rowToReviewFile(data as Record<string, unknown>);
}

/**
 * Update a review file's mutable fields.
 * Does NOT enforce status transitions — caller must validate via isValidTransition().
 */
export async function updateReviewFile(
  supabase: SupabaseClient,
  reviewFileId: string,
  updates: {
    status?: ReviewFileStatus;
    assignedPreparerId?: string | null;
    assignedReviewerId?: string | null;
    exceptionCount?: number;
    readinessScore?: number;
    reviewerNotes?: string | null;
    reviewerApprovedAt?: string | null;
  },
): Promise<ReviewFile | null> {
  // Map camelCase to snake_case for DB columns
  const dbUpdates: Record<string, unknown> = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.assignedPreparerId !== undefined) dbUpdates.assigned_preparer_id = updates.assignedPreparerId;
  if (updates.assignedReviewerId !== undefined) dbUpdates.assigned_reviewer_id = updates.assignedReviewerId;
  if (updates.exceptionCount !== undefined) dbUpdates.exception_count = updates.exceptionCount;
  if (updates.readinessScore !== undefined) dbUpdates.readiness_score = updates.readinessScore;
  if (updates.reviewerNotes !== undefined) dbUpdates.reviewer_notes = updates.reviewerNotes;
  if (updates.reviewerApprovedAt !== undefined) dbUpdates.reviewer_approved_at = updates.reviewerApprovedAt;

  if (Object.keys(dbUpdates).length === 0) return null;

  const { data, error } = await supabase
    .from('review_files')
    .update(dbUpdates)
    .eq('id', reviewFileId)
    .select('*')
    .single();

  if (error || !data) {
    log('error', 'review-data:update-failed', { error: error?.message });
    return null;
  }

  return rowToReviewFile(data as Record<string, unknown>);
}

// ============================================================
// REVIEW NOTES
// ============================================================

/**
 * List all notes for a review file, newest first.
 */
export async function listReviewNotes(
  supabase: SupabaseClient,
  reviewFileId: string,
): Promise<ReviewNote[]> {
  const { data, error } = await supabase
    .from('review_notes')
    .select('*')
    .eq('review_file_id', reviewFileId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (error) {
      log('error', 'review-data:notes-list-failed', { error: error.message });
    }
    return [];
  }

  return (data as Array<Record<string, unknown>>).map(rowToReviewNote);
}

/**
 * Add a note to a review file.
 */
export async function createReviewNote(
  supabase: SupabaseClient,
  reviewFileId: string,
  userId: string,
  content: string,
  nodeType?: ReviewNoteNodeType | null,
  nodeId?: string | null,
): Promise<ReviewNote | null> {
  const { data, error } = await supabase
    .from('review_notes')
    .insert({
      review_file_id: reviewFileId,
      user_id: userId,
      content,
      node_type: nodeType ?? null,
      node_id: nodeId ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    log('error', 'review-data:note-create-failed', { error: error?.message });
    return null;
  }

  return rowToReviewNote(data as Record<string, unknown>);
}
