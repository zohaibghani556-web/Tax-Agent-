'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Save, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addCsrfHeader } from '@/lib/csrf-client';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--emerald)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 transition-colors"
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--emerald)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 transition-colors appearance-none"
    >
      {children}
    </select>
  );
}

function SaveButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
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
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-[var(--emerald)]' : 'bg-slate-200'}`}
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
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
            <Input type="text" defaultValue="Jordan Smith" />
          </Field>
          <Field label="Email address">
            <Input type="email" defaultValue="jordan@example.com" />
          </Field>
          <Field label="Date of birth">
            <Input type="date" defaultValue="1990-06-15" />
          </Field>
          <Field label="Province">
            <Select defaultValue="ON">
              <option value="ON">Ontario</option>
            </Select>
          </Field>
        </div>
        <SaveButton />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="New password">
          <Input type="password" placeholder="Choose a new password" />
        </Field>
        <SaveButton />

        <div className="border-t border-[var(--border)] pt-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Two-factor authentication</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Adds an extra layer of security to your account.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
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

      {/* Data */}
      <SectionCard title="Your data">
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 transition-colors">
            Export my data (JSON)
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Account deletion is permanent. All your data will be removed within 30 days in compliance with PIPEDA.
        </p>
      </SectionCard>

      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Delete account?</h3>
              <button onClick={() => { setShowConfirmDelete(false); setDeleteConfirmText(''); setDeleteError(''); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Type <strong>DELETE</strong> to confirm. This removes all your 2025 tax data, slips, calculations, and filing guides permanently. Canadian tax records should be kept 6 years — download your data first if needed.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors mb-4"
            />
            {deleteError && (
              <p className="text-xs text-red-600 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmDelete(false); setDeleteConfirmText(''); setDeleteError(''); }}
                className="flex-1 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
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
