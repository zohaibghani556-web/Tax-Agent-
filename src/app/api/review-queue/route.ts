/**
 * TaxAgent.ai — Review Queue API
 *
 * GET /api/review-queue — list review files visible to the authenticated user.
 *
 * Query params:
 *   - status: filter by ReviewFileStatus
 *   - year: filter by tax year (default 2025)
 *   - assigned_to_me: "true" to show only files assigned to the user
 *
 * Security: auth required, rate limited. Read-only — no CSRF needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { listReviewFiles } from '@/lib/review-queue/review-data';
import { REVIEW_FILE_STATUSES } from '@/lib/review-queue/types';
import type { ReviewFileStatus } from '@/lib/review-queue/types';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(`review-queue:${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  // Parse query params
  const statusParam = req.nextUrl.searchParams.get('status');
  const yearParam = req.nextUrl.searchParams.get('year');
  const assignedToMe = req.nextUrl.searchParams.get('assigned_to_me') === 'true';

  // Validate status if provided
  if (statusParam && !REVIEW_FILE_STATUSES.includes(statusParam as ReviewFileStatus)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const taxYear = yearParam ? parseInt(yearParam, 10) : undefined;
  if (taxYear !== undefined && (isNaN(taxYear) || taxYear < 2020 || taxYear > 2030)) {
    return NextResponse.json({ error: 'Invalid tax year' }, { status: 400 });
  }

  const files = await listReviewFiles(supabase, {
    status: statusParam as ReviewFileStatus | undefined,
    taxYear,
    assignedToMe,
    userId: user.id,
  });

  return NextResponse.json({ files });
}
