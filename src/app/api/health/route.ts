/**
 * TaxAgent.ai — Health Check Endpoint
 *
 * GET /api/health
 * No auth required. Used by Vercel, uptime monitors, and load balancers.
 * Pings Supabase to verify database connectivity.
 *
 * Response 200: { status: 'ok', db: 'ok', ts: ISO, version: '1.0.0' }
 * Response 503: { status: 'degraded', db: 'error', ts: ISO }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const ts = new Date().toISOString();

  try {
    const supabase = await createServerSupabaseClient();
    // Lightweight connectivity check — reads one row from tax_profiles (anon key, RLS applies)
    const { error } = await supabase
      .from('tax_profiles')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: 'error', ts },
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    return NextResponse.json(
      { status: 'ok', db: 'ok', ts, version: '1.0.0' },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'error', ts },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
