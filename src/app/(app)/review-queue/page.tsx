'use client';

/**
 * TaxAgent.ai — CPA Review Queue Page
 *
 * Table/list view of review files with filters, status badges,
 * sortable columns, and an approve button with confirmation modal.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Filter,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addCsrfHeader } from '@/lib/csrf-client';
import type { ReviewFile, ReviewFileStatus } from '@/lib/review-queue/types';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReviewFileStatus, { bg: string; text: string; label: string }> = {
  in_prep:    { bg: 'bg-white/10',         text: 'text-white/60',      label: 'In Prep' },
  in_review:  { bg: 'bg-blue-500/20',      text: 'text-blue-400',      label: 'In Review' },
  approved:   { bg: 'bg-emerald-500/20',   text: 'text-emerald-400',   label: 'Approved' },
  filed:      { bg: 'bg-emerald-500/20',   text: 'text-emerald-300',   label: 'Filed' },
  needs_info: { bg: 'bg-amber-500/20',     text: 'text-amber-400',     label: 'Needs Info' },
};

type SortField = 'status' | 'exceptionCount' | 'updatedAt' | 'readinessScore';
type SortDir = 'asc' | 'desc';

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const router = useRouter();
  const [files, setFiles] = useState<ReviewFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReviewFileStatus | ''>('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Approve modal
  const [approveTarget, setApproveTarget] = useState<ReviewFile | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => { document.title = 'Review Queue — TaxAgent.ai'; }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? '';
    setUserId(uid);
    if (!uid) { setLoading(false); return; }

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('year', '2025');
    if (assignedToMe) params.set('assigned_to_me', 'true');

    try {
      const res = await fetch(`/api/review-queue?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setFiles(json.files ?? []);
      } else {
        toast.error('Failed to load review queue');
      }
    } catch {
      toast.error('Network error loading review queue');
    }
    setLoading(false);
  }, [statusFilter, assignedToMe]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // ─── Sort logic ─────────────────────────────────────────────────────────

  const sorted = [...files].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'status': cmp = a.status.localeCompare(b.status); break;
      case 'exceptionCount': cmp = a.exceptionCount - b.exceptionCount; break;
      case 'readinessScore': cmp = a.readinessScore - b.readinessScore; break;
      case 'updatedAt': cmp = a.updatedAt.localeCompare(b.updatedAt); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  // ─── Status transition ──────────────────────────────────────────────────

  async function updateStatus(fileId: string, newStatus: ReviewFileStatus) {
    try {
      const res = await fetch(
        `/api/review-queue/${fileId}`,
        addCsrfHeader({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }),
      );
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
        fetchFiles();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to update status');
      }
    } catch {
      toast.error('Network error');
    }
  }

  // ─── Approve ────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const res = await fetch(
        `/api/review-queue/${approveTarget.id}/approve`,
        addCsrfHeader({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      if (res.ok) {
        toast.success('File approved');
        setApproveTarget(null);
        fetchFiles();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Approval failed');
      }
    } catch {
      toast.error('Network error');
    }
    setApproving(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Review Queue
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Triage, review, and approve tax files — 2025
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 backdrop-blur-xl flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40 uppercase tracking-wide">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReviewFileStatus | '')}
              className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="">All</option>
              <option value="in_prep">In Prep</option>
              <option value="in_review">In Review</option>
              <option value="needs_info">Needs Info</option>
              <option value="approved">Approved</option>
              <option value="filed">Filed</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => setAssignedToMe(e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500/20"
            />
            Assigned to me
          </label>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && (
        <div
          className="flex flex-col items-center gap-4 rounded-xl px-6 py-12 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <Search className="w-8 h-8 text-white/20" />
          <p className="text-white/40 text-sm">No review files found. Files appear here when added to the review queue.</p>
        </div>
      )}

      {/* Table */}
      {!loading && files.length > 0 && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_80px_80px_140px_120px] gap-2 px-4 py-3 border-b border-white/10 text-xs text-white/40 uppercase tracking-wide">
            <span>File</span>
            <SortHeader label="Status" field="status" current={sortField} dir={sortDir} onToggle={toggleSort} />
            <SortHeader label="Issues" field="exceptionCount" current={sortField} dir={sortDir} onToggle={toggleSort} />
            <SortHeader label="Ready" field="readinessScore" current={sortField} dir={sortDir} onToggle={toggleSort} />
            <SortHeader label="Updated" field="updatedAt" current={sortField} dir={sortDir} onToggle={toggleSort} />
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          {sorted.map((file) => (
            <ReviewFileRow
              key={file.id}
              file={file}
              userId={userId}
              onOpenTaxFile={() => router.push(`/tax-file`)}
              onUpdateStatus={updateStatus}
              onApprove={() => setApproveTarget(file)}
            />
          ))}
        </div>
      )}

      {/* Approve confirmation modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-zinc-900 border border-white/10 p-6 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Approve Tax File
            </h2>
            <p className="text-sm text-white/60">
              This will mark the file as approved. The system will verify there are
              no unresolved error-level warnings before approving.
            </p>
            <p className="text-xs text-white/40">
              Profile: {approveTarget.profileId.slice(0, 8)}... &middot; Year: {approveTarget.taxYear}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setApproveTarget(null)}
                disabled={approving}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Sort Header ────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  current,
  dir,
  onToggle,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onToggle: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onToggle(field)}
      className={`text-left flex items-center gap-1 hover:text-white/80 transition-colors ${active ? 'text-white/70' : ''}`}
    >
      {label}
      {active && (
        <ChevronDown className={`w-3 h-3 transition-transform ${dir === 'asc' ? 'rotate-180' : ''}`} />
      )}
    </button>
  );
}

// ─── Row Component ──────────────────────────────────────────────────────────

function ReviewFileRow({
  file,
  userId,
  onOpenTaxFile,
  onUpdateStatus,
  onApprove,
}: {
  file: ReviewFile;
  userId: string;
  onOpenTaxFile: () => void;
  onUpdateStatus: (id: string, status: ReviewFileStatus) => void;
  onApprove: () => void;
}) {
  const style = STATUS_CONFIG[file.status];
  const updatedDate = new Date(file.updatedAt).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAssignedReviewer = file.assignedReviewerId === userId;

  return (
    <div
      className="grid grid-cols-[1fr_100px_80px_80px_140px_120px] gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors items-center cursor-pointer"
      onClick={onOpenTaxFile}
    >
      {/* File info */}
      <div className="min-w-0">
        <p className="text-sm text-white truncate">
          {file.profileId.slice(0, 8)}...
        </p>
        <p className="text-xs text-white/30">
          {file.taxYear}
          {file.assignedPreparerId && <span> &middot; Prep assigned</span>}
          {file.assignedReviewerId && <span> &middot; Review assigned</span>}
        </p>
      </div>

      {/* Status badge */}
      <div>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      {/* Exception count */}
      <div className="text-sm">
        {file.exceptionCount > 0 ? (
          <span className="text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {file.exceptionCount}
          </span>
        ) : (
          <span className="text-white/30">0</span>
        )}
      </div>

      {/* Readiness score */}
      <div>
        <ReadinessBar score={file.readinessScore} />
      </div>

      {/* Updated at */}
      <div className="text-xs text-white/40">{updatedDate}</div>

      {/* Actions */}
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {file.status === 'in_prep' && (
          <button
            onClick={() => onUpdateStatus(file.id, 'in_review')}
            className="px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="Mark ready for review"
          >
            Submit
          </button>
        )}
        {file.status === 'in_review' && isAssignedReviewer && (
          <>
            <button
              onClick={onApprove}
              className="px-2 py-1 rounded text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Approve"
            >
              Approve
            </button>
            <button
              onClick={() => onUpdateStatus(file.id, 'needs_info')}
              className="px-2 py-1 rounded text-xs text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Request more info"
            >
              Info?
            </button>
          </>
        )}
        {file.status === 'needs_info' && (
          <button
            onClick={() => onUpdateStatus(file.id, 'in_prep')}
            className="px-2 py-1 rounded text-xs text-white/60 hover:bg-white/10 transition-colors"
            title="Return to prep"
          >
            Re-prep
          </button>
        )}
        {file.status === 'approved' && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Readiness Bar ──────────────────────────────────────────────────────────

function ReadinessBar({ score }: { score: number }) {
  let color = 'bg-emerald-500';
  if (score < 50) color = 'bg-red-500';
  else if (score < 80) color = 'bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-white/40 w-7 text-right">{score}</span>
    </div>
  );
}
