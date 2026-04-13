/**
 * Auth callback handler for Supabase email confirmation and OAuth.
 * Supabase redirects here after the user clicks the confirmation link.
 * We exchange the one-time code for a session cookie then redirect to the app.
 *
 * Welcome email: sent on first-time email confirmation (user created within
 * the last 24 hours). Fire-and-forget — never blocks the redirect.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/transactional';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Send welcome email for new email-confirmed accounts.
    // Condition: email provider + account created within the last 24 hours
    // (the confirmation link is one-time use so this callback fires exactly once per signup).
    if (data.user) {
      const { user } = data;
      const isEmailProvider = user.app_metadata?.provider === 'email';
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const isNewAccount = Date.now() - createdAt < 24 * 60 * 60 * 1000;

      if (isEmailProvider && isNewAccount && user.email) {
        const name = (user.user_metadata?.full_name as string | undefined) ?? '';
        // Fire-and-forget: do not await — welcome email must never block the redirect
        void sendWelcomeEmail(user.email, name);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
