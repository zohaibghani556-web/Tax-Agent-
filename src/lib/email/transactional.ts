/**
 * TaxAgent.ai — Transactional email helpers (Resend).
 *
 * Covers two lifecycle events:
 *   1. Welcome — sent once after a user confirms their email address
 *   2. Assessment complete — sent when the AI finishes the full tax assessment
 *
 * All functions are fire-and-forget safe: they swallow errors and never throw,
 * so a Resend outage cannot break the user-facing flow.
 *
 * Sending domain: onboarding@resend.dev (shared domain for testing).
 * Swap to noreply@taxagent.ai once the domain is verified in Resend dashboard.
 */

import { Resend } from 'resend';
import { log } from '@/lib/logger';

const FROM = 'TaxAgent.ai <onboarding@resend.dev>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    log('warn', 'email.welcome_skipped', { reason: 'RESEND_API_KEY not set' });
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to TaxAgent.ai — let\'s file your 2025 taxes',
      html: welcomeHtml(name),
    });
    if (error) {
      log('warn', 'email.welcome_failed', { resendError: error.message });
    } else {
      log('info', 'email.welcome_sent');
    }
  } catch (err) {
    log('warn', 'email.welcome_exception', { message: (err as Error).message });
  }
}

// ─── Assessment complete email ────────────────────────────────────────────────

export async function sendAssessmentCompleteEmail(
  email: string,
  name: string,
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    log('warn', 'email.assessment_complete_skipped', { reason: 'RESEND_API_KEY not set' });
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Your 2025 tax assessment is ready — here\'s your estimate',
      html: assessmentCompleteHtml(name),
    });
    if (error) {
      log('warn', 'email.assessment_complete_failed', { resendError: error.message });
    } else {
      log('info', 'email.assessment_complete_sent');
    }
  } catch (err) {
    log('warn', 'email.assessment_complete_exception', { message: (err as Error).message });
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function welcomeHtml(name: string): string {
  const displayName = name || 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1020;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              TaxAgent<span style="color:#34d399;">.ai</span>
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
              Welcome, ${displayName}
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6;">
              Your TaxAgent.ai account is active. You can now file your 2025 Ontario T1 return using AI-guided assessment — no tax knowledge required.
            </p>
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.40);text-transform:uppercase;letter-spacing:0.05em;">
              What to do next
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:32px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="color:#34d399;font-size:14px;font-weight:600;">1.</span>
                  <span style="color:rgba(255,255,255,0.75);font-size:14px;margin-left:8px;">Start your AI tax assessment (takes ~10 minutes)</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="color:#34d399;font-size:14px;font-weight:600;">2.</span>
                  <span style="color:rgba(255,255,255,0.75);font-size:14px;margin-left:8px;">Upload your T4 slip — AI reads every box automatically</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <span style="color:#34d399;font-size:14px;font-weight:600;">3.</span>
                  <span style="color:rgba(255,255,255,0.75);font-size:14px;margin-left:8px;">Get your exact refund and a personalized CRA filing guide</span>
                </td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#10b981;border-radius:100px;">
                  <a href="https://taxagent.ai/onboarding" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Start my assessment →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.6;">
              Your data is encrypted and stored exclusively in Canada (AWS ca-central-1). We never share it. PIPEDA compliant.<br>
              Questions? Reply to this email or visit <a href="https://taxagent.ai" style="color:#34d399;">taxagent.ai</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function assessmentCompleteHtml(name: string): string {
  const displayName = name || 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1020;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              TaxAgent<span style="color:#34d399;">.ai</span>
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
              Your assessment is ready, ${displayName}
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6;">
              Your 2025 Ontario T1 tax assessment is complete. Your estimated refund and a detailed breakdown are waiting in your dashboard.
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6;">
              Your personalized CRA filing guide has also been generated — it contains step-by-step instructions tailored to your exact situation.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#10b981;border-radius:100px;">
                  <a href="https://taxagent.ai/calculator" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    View my results →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.6;">
              All calculations use CRA's official 2025 rates. Your data is stored exclusively in Canada. PIPEDA compliant.<br>
              Questions? Reply to this email or visit <a href="https://taxagent.ai" style="color:#34d399;">taxagent.ai</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
