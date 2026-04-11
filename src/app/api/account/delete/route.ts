/**
 * TaxAgent.ai — Account Deletion API
 *
 * POST /api/account/delete
 * Permanently deletes the authenticated user's account and all associated data.
 *
 * PIPEDA compliance: data is deleted in response to the user's explicit request.
 * CRA note: users should retain tax records for 6 years (ITA s.230(4)) — the UI
 * prompts them to download their data before proceeding.
 *
 * Deletion order respects FK constraints:
 *   1. tax_slips (references tax_profiles)
 *   2. tax_calculations (references tax_profiles)
 *   3. deductions_credits (references tax_profiles)
 *   4. tax_profiles (references auth.users)
 *   5. auth.admin.deleteUser() — removes Supabase auth record
 *
 * Security:
 *   - Requires valid Supabase JWT
 *   - CSRF validation
 *   - Rate limited: 3 requests per user per hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // --- Auth ---
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- CSRF validation ---
  if (!validateCsrfToken(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // --- Rate limit: 3 deletion attempts per user per hour ---
  if (!checkRateLimit(`delete:${user.id}`, 3, 60 * 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  // --- Service role client — bypasses RLS for admin deletion operations ---
  const cookieStore = await cookies();
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const userId = user.id;

  try {
    // Fetch profile IDs for this user (needed for FK-safe child-table deletions)
    const { data: profiles, error: profileFetchError } = await adminClient
      .from('tax_profiles')
      .select('id')
      .eq('user_id', userId);
    if (profileFetchError) throw profileFetchError;
    const profileIds = (profiles ?? []).map((p: { id: string }) => p.id);

    // 1. Delete tax slips (FK → tax_profiles)
    if (profileIds.length > 0) {
      const { error: slipsError } = await adminClient
        .from('tax_slips')
        .delete()
        .in('profile_id', profileIds);
      if (slipsError) throw slipsError;

      // 2. Delete tax calculations (FK → tax_profiles)
      const { error: calcsError } = await adminClient
        .from('tax_calculations')
        .delete()
        .in('profile_id', profileIds);
      if (calcsError) throw calcsError;

      // 3. Delete deductions/credits rows (FK → tax_profiles)
      const { error: deductionsError } = await adminClient
        .from('deductions_credits')
        .delete()
        .in('profile_id', profileIds);
      if (deductionsError) throw deductionsError;
    }

    // 4. Delete tax profiles
    const { error: profilesError } = await adminClient
      .from('tax_profiles')
      .delete()
      .eq('user_id', userId);
    if (profilesError) throw profilesError;

    // 5. Delete Supabase auth user (must be last — removes login access)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    log('info', 'account.deleted');
    return NextResponse.json({ message: 'Account permanently deleted' }, { status: 200 });
  } catch (err) {
    log('error', 'account.deletion_failed', { message: (err as Error).message });
    return NextResponse.json(
      { error: 'Deletion failed. Contact support.' },
      { status: 500 },
    );
  }
}
