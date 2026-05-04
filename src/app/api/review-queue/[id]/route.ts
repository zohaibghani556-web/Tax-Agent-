/**
 * TaxAgent.ai — Review File Update API
 *
 * PATCH /api/review-queue/[id] — update status, assignment, or notes.
 *
 * Status transitions are validated against VALID_TRANSITIONS.
 * Approval must go through POST /api/review-queue/[id]/approve instead.
 *
 * Security: auth + CSRF + rate limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import { getReviewFile, updateReviewFile } from '@/lib/review-queue/review-data';
import { isValidTransition, REVIEW_FILE_STATUSES } from '@/lib/review-queue/types';
import type { ReviewFileStatus } from '@/lib/review-queue/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!validateCsrfToken(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  if (!checkRateLimit(`review-update:${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Fetch current file (RLS ensures access)
  const current = await getReviewFile(supabase, id);
  if (!current) {
    return NextResponse.json({ error: 'Review file not found' }, { status: 404 });
  }

  // Validate status transition if status is being changed
  const newStatus = body.status as string | undefined;
  if (newStatus) {
    if (!REVIEW_FILE_STATUSES.includes(newStatus as ReviewFileStatus)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Approval must go through the /approve endpoint
    if (newStatus === 'approved') {
      return NextResponse.json(
        { error: 'Use POST /api/review-queue/[id]/approve to approve a file' },
        { status: 400 },
      );
    }

    if (!isValidTransition(current.status, newStatus as ReviewFileStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${current.status}' to '${newStatus}'` },
        { status: 422 },
      );
    }
  }

  // Build update payload — only allow known fields
  const updates: Record<string, unknown> = {};
  if (newStatus) updates.status = newStatus;
  if (body.assignedPreparerId !== undefined) updates.assignedPreparerId = body.assignedPreparerId;
  if (body.assignedReviewerId !== undefined) updates.assignedReviewerId = body.assignedReviewerId;
  if (body.reviewerNotes !== undefined) updates.reviewerNotes = body.reviewerNotes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await updateReviewFile(supabase, id, updates);
  if (!updated) {
    log('error', 'review-queue:patch-failed', { reviewFileId: id });
    return NextResponse.json({ error: 'Failed to update review file' }, { status: 500 });
  }

  return NextResponse.json({ file: updated });
}
