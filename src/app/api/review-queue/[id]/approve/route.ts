/**
 * TaxAgent.ai — Review File Approval API
 *
 * POST /api/review-queue/[id]/approve — approve a review file.
 *
 * Hard-stop gate: assembles the TaxFileGraph and fails if there are
 * any unresolved error-level warnings. Only files in 'in_review' status
 * can be approved.
 *
 * Security: auth + CSRF + rate limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import { getReviewFile, updateReviewFile } from '@/lib/review-queue/review-data';
import { assembleTaxFileGraph } from '@/lib/tax-file/assembler';
import { countErrorWarnings } from '@/lib/review-queue/readiness-score';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
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

  if (!checkRateLimit(`review-approve:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  // Fetch review file (RLS ensures access)
  const reviewFile = await getReviewFile(supabase, id);
  if (!reviewFile) {
    return NextResponse.json({ error: 'Review file not found' }, { status: 404 });
  }

  // Only in_review → approved is valid
  if (reviewFile.status !== 'in_review') {
    return NextResponse.json(
      { error: `Cannot approve a file in '${reviewFile.status}' status. Must be 'in_review'.` },
      { status: 422 },
    );
  }

  // Resolve the profile owner's user_id to assemble the graph
  const { data: profileRow, error: profileErr } = await supabase
    .from('tax_profiles')
    .select('user_id')
    .eq('id', reviewFile.profileId)
    .single();

  if (profileErr || !profileRow) {
    log('error', 'review-approve:profile-not-found', { profileId: reviewFile.profileId });
    return NextResponse.json({ error: 'Associated tax profile not found' }, { status: 404 });
  }

  // Assemble graph to check for error-level warnings
  const graph = await assembleTaxFileGraph(
    supabase,
    profileRow.user_id as string,
    reviewFile.taxYear,
  );

  if (!graph) {
    return NextResponse.json({ error: 'Could not assemble tax file for validation' }, { status: 500 });
  }

  // HARD-STOP GATE: no error-level warnings allowed
  const errorCount = countErrorWarnings(graph);
  if (errorCount > 0) {
    const errorWarnings = graph.warnings.filter((w) => w.severity === 'error');
    return NextResponse.json(
      {
        error: `Cannot approve: ${errorCount} unresolved error-level warning(s)`,
        warnings: errorWarnings,
      },
      { status: 422 },
    );
  }

  // Approve
  const now = new Date().toISOString();
  const updated = await updateReviewFile(supabase, id, {
    status: 'approved',
    reviewerApprovedAt: now,
  });

  if (!updated) {
    log('error', 'review-approve:update-failed', { reviewFileId: id });
    return NextResponse.json({ error: 'Failed to approve review file' }, { status: 500 });
  }

  return NextResponse.json({ file: updated });
}
