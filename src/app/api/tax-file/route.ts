/**
 * TaxAgent.ai — Tax File Graph API
 *
 * GET /api/tax-file?year=2025
 *
 * Returns the assembled Tax File Graph for the authenticated user.
 * Read-only — no data mutations. Auth required via Supabase JWT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { assembleTaxFileGraph } from '@/lib/tax-file/assembler';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth check
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse tax year from query params (default 2025)
  const yearParam = req.nextUrl.searchParams.get('year');
  const taxYear = yearParam ? parseInt(yearParam, 10) : 2025;
  if (isNaN(taxYear) || taxYear < 2020 || taxYear > 2030) {
    return NextResponse.json({ error: 'Invalid tax year' }, { status: 400 });
  }

  const graph = await assembleTaxFileGraph(supabase, user.id, taxYear);

  if (!graph) {
    return NextResponse.json(
      { error: 'No tax profile found. Complete your assessment first.' },
      { status: 404 },
    );
  }

  return NextResponse.json(graph);
}
