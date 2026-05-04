/**
 * TaxAgent.ai — Review Notes API
 *
 * POST /api/review-queue/[id]/notes — add a reviewer note to a review file.
 *
 * Body: { content: string, nodeType?: string, nodeId?: string }
 *
 * Security: auth + CSRF + rate limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import { getReviewFile, createReviewNote } from '@/lib/review-queue/review-data';
import type { ReviewNoteNodeType } from '@/lib/review-queue/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_NODE_TYPES: readonly string[] = ['slip', 'extraction', 'calculation', 'general'];

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

  if (!checkRateLimit(`review-notes:${user.id}`, 60, 60_000)) {
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

  const content = body.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required and must be non-empty' }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: 'content must be 5000 characters or fewer' }, { status: 400 });
  }

  const nodeType = body.nodeType as string | undefined;
  if (nodeType && !VALID_NODE_TYPES.includes(nodeType)) {
    return NextResponse.json({ error: 'Invalid nodeType' }, { status: 400 });
  }

  const nodeId = body.nodeId as string | undefined;
  if (nodeId && !UUID_RE.test(nodeId)) {
    return NextResponse.json({ error: 'Invalid nodeId format' }, { status: 400 });
  }

  // Verify review file exists and user has access (RLS)
  const reviewFile = await getReviewFile(supabase, id);
  if (!reviewFile) {
    return NextResponse.json({ error: 'Review file not found' }, { status: 404 });
  }

  const note = await createReviewNote(
    supabase,
    id,
    user.id,
    content.trim(),
    (nodeType as ReviewNoteNodeType) ?? null,
    nodeId ?? null,
  );

  if (!note) {
    log('error', 'review-notes:create-failed', { reviewFileId: id });
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }

  return NextResponse.json({ note }, { status: 201 });
}
