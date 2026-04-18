'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clipboard, Download, Eye, EyeOff, Save, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addCsrfHeader } from '@/lib/csrf-client';
import { toast } from 'sonner';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/60 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--emerald)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16,185,129,0.2)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors appearance-none"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {children}
    </select>
  );
}

function SaveButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick ?? (() => toast.success('Changes saved', { duration: 2000 }))}
      className="flex items-center gap-2 rounded-full bg-[var(--emerald)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
    >
      <Save className="h-4 w-4" />
      Save changes
    </button>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-white/80">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-[var(--emerald)]' : 'bg-white/10'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    document.title = 'Settings — TaxAgent.ai';
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email ?? '');
        setUserFullName(
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          ''
        );
      }
    });
  }, []);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    filingDeadline: true,
    rrspDeadline: true,
    slipAvailable: false,
  });

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', addCsrfHeader({ method: 'POST' }));
      if (res.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
      } else {
        const data = await res.json() as { error?: string };
        setDeleteError(data.error ?? 'Deletion failed. Please contact support.');
      }
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <SectionCard title="Profile">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <Input type="text" value={userFullName} readOnly placeholder="Your name" />
          </Field>
          <Field label="Email address">
            <Input type="email" value={userEmail} readOnly placeholder="Your email" />
          </Field>
          <Field label="Province">
            <Select defaultValue="ON">
              <option value="ON">Ontario</option>
            </Select>
          </Field>
        </div>
        <p className="text-xs text-white/30">Profile details are managed through your account provider.</p>
      </SectionCard>

      {/* Tax Profile */}
      <SectionCard title="Tax Profile">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Marital status">
            <Select defaultValue="single">
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="common-law">Common-law</option>
              <option value="separated">Separated</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </Select>
          </Field>
          <Field label="Residency status">
            <Select defaultValue="citizen">
              <option value="citizen">Canadian citizen</option>
              <option value="permanent-resident">Permanent resident</option>
              <option value="newcomer">Newcomer (part-year)</option>
              <option value="deemed-resident">Deemed resident</option>
            </Select>
          </Field>
          <Field label="Number of dependants">
            <Input type="number" defaultValue="0" min="0" max="20" />
          </Field>
        </div>
        <SaveButton />
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security">
        <Field label="Current password">
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} placeholder="Enter current password" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="New password">
          <Input type="password" placeholder="Choose a new password" />
        </Field>
        <SaveButton />

        <div className="pt-4 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Two-factor authentication</p>
              <p className="text-xs text-white/40 mt-0.5">Adds an extra layer of security to your account.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Coming soon
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications">
        <div className="divide-y divide-[var(--border)]">
          <Toggle
            label="Filing deadline reminder"
            description="Email reminder 30, 14, and 7 days before April 30."
            checked={notifications.filingDeadline}
            onChange={(v) => setNotifications((n) => ({ ...n, filingDeadline: v }))}
          />
          <Toggle
            label="RRSP deadline reminder"
            description="Email reminder before the RRSP contribution deadline (March 1)."
            checked={notifications.rrspDeadline}
            onChange={(v) => setNotifications((n) => ({ ...n, rrspDeadline: v }))}
          />
          <Toggle
            label="New T4 / slip available"
            description="Notify me when a new slip may be available from CRA My Account."
            checked={notifications.slipAvailable}
            onChange={(v) => setNotifications((n) => ({ ...n, slipAvailable: v }))}
          />
        </div>
        <SaveButton />
      </SectionCard>

      {/* Referral */}
      <SectionCard title="Refer a friend">
        {userId ? (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Invite friends to get their free tax estimate.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taxagent.ai'}/signup?ref=${userId.slice(0, 8)}`}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white/50 select-all focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taxagent.ai'}/signup?ref=${userId.slice(0, 8)}`);
                  toast.success('Referral link copied!', { duration: 2000 });
                }}
                className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                aria-label="Copy referral link"
              >
                <Clipboard className="h-4 w-4" />
                Copy link
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/30">Loading…</p>
        )}
      </SectionCard>

      {/* Data */}
      <SectionCard title="Your data">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              const data = {
                userId,
                exportedAt: new Date().toISOString(),
                taxYear: 2025,
                localStorage: Object.fromEntries(
                  Object.entries(localStorage).filter(([k]) => k.startsWith('taxagent_'))
                ),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `taxagent-data-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Data exported');
            }}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <Download className="h-4 w-4" />
            Export my data (JSON)
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
            style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </button>
        </div>
        <p className="text-xs text-white/30">
          Account deletion is permanent. All your data will be removed within 30 days in compliance with PIPEDA.
        </p>
      </SectionCard>

      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ background: '#111b2e', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Delete account?</h3>
              <button
                onClick={() => { setShowConfirmDelete(false); setDeleteConfirmText(''); setDeleteError(''); }}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Type <strong className="text-white">DELETE</strong> to confirm. This removes all your 2025 tax data, slips, calculations, and filing guides permanently. Canadian tax records should be kept 6 years — download your data first if needed.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            {deleteError && (
              <p className="text-xs text-red-400 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmDelete(false); setDeleteConfirmText(''); setDeleteError(''); }}
                className="flex-1 rounded-full px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
