'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Trash2, FileText, Check, ArrowRight, ChevronRight, Cloud, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SlipUpload } from '@/components/slips/SlipUpload';
import { ManualEntryForm } from '@/components/slips/ManualEntryForm';
import { SLIP_TYPE_LABELS, SLIP_PRIMARY_BOX } from '@/lib/slips/slip-fields';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getSlips, upsertSlips } from '@/lib/supabase/tax-data';
import type { SavedSlip } from '@/lib/supabase/tax-data';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlipRec {
  type: string;
  description: string;
  where: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SLIP_GRID = [
  { icon: '💼', type: 'T4',    desc: 'Employment income' },
  { icon: '🏦', type: 'T5',    desc: 'Investment income' },
  { icon: '🎓', type: 'T2202', desc: 'Tuition & education' },
  { icon: '📈', type: 'T5008', desc: 'Securities transactions' },
  { icon: '🏛',  type: 'T4A',   desc: 'Pension & other income' },
  { icon: '📊', type: 'T3',    desc: 'Trust income' },
] as const;

// localStorage key for slips the user has marked as "I don't have this"
const DISMISSED_KEY = 'taxagent_dismissed_slips';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

function primaryAmount(slip: SavedSlip): string {
  const def = SLIP_PRIMARY_BOX[slip.type];
  if (!def) return '';
  const v = slip.data[def.key];
  if (typeof v === 'number' && v > 0) return `${def.label}: ${formatCad(v)}`;
  return '';
}

function formatLastSaved(date: Date | null): string {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just saved';
  if (diffMin < 60) return `${diffMin} min ago`;
  return date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

/** Convert slip type to URL-safe segment: "RRSP-Receipt" → "rrsp-receipt" */
function slipTypeToRoute(type: string): string {
  return type.toLowerCase().replace(/_/g, '-');
}

// ── Slip type card ─────────────────────────────────────────────────────────────

type SlipCardStatus = 'done' | 'review' | 'pending';

const TONE: Record<SlipCardStatus, { bg: string; border: string; text: string; label: string }> = {
  done:    { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)',  text: 'var(--emerald)', label: 'Extracted' },
  review:  { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)',  text: '#F59E0B', label: 'Review needed' },
  pending: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.5)', label: 'Not uploaded' },
};

function SlipTypeCard({
  icon,
  type,
  desc,
  slipsForType,
  onUploadClick,
}: {
  icon: string;
  type: string;
  desc: string;
  slipsForType: SavedSlip[];
  onUploadClick: () => void;
}) {
  let status: SlipCardStatus = 'pending';
  if (slipsForType.length > 0) {
    const hasIncomplete = slipsForType.some((s) => {
      const def = SLIP_PRIMARY_BOX[s.type];
      if (!def) return false;
      const v = s.data[def.key];
      return typeof v !== 'number' || v === 0;
    });
    status = hasIncomplete ? 'review' : 'done';
  }

  const t = TONE[status];
  const count = slipsForType.length;

  return (
    <div
      className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 cursor-pointer"
      style={{ background: t.bg, border: `1px solid ${t.border}` }}
      onClick={status === 'pending' ? onUploadClick : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {icon}
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ color: t.text, background: t.bg, border: `1px solid ${t.border}` }}
        >
          {t.label}
        </span>
      </div>
      <div className="text-white font-bold text-[16px] mb-0.5">{type}</div>
      <div className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {status === 'pending' ? desc : `${count} slip${count !== 1 ? 's' : ''} entered`}
      </div>
      {status === 'pending' ? (
        <Link
          href={`/slips/upload/${slipTypeToRoute(type)}`}
          className="w-full text-white font-semibold text-[13px] py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload {type}
        </Link>
      ) : (
        <button
          className="w-full font-semibold text-[13px] py-2 rounded-lg transition-colors"
          style={{
            background: status === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${t.border}`,
            color: t.text,
          }}
          onClick={(e) => { e.stopPropagation(); onUploadClick(); }}
        >
          {status === 'done' ? 'View / add another →' : 'Review extracted boxes →'}
        </button>
      )}
    </div>
  );
}

// ── Checklist item ─────────────────────────────────────────────────────────────

function ChecklistItem({
  rec,
  done,
  dismissed,
  onDismiss,
  onUndismiss,
}: {
  rec: SlipRec;
  done: boolean;
  dismissed: boolean;
  onDismiss: (type: string) => void;
  onUndismiss: (type: string) => void;
}) {
  if (dismissed) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 opacity-50"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <X className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold line-through" style={{ color: 'rgba(255,255,255,0.35)' }}>{rec.type}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Marked as not applicable</p>
        </div>
        <button
          onClick={() => onUndismiss(rec.type)}
          className="text-[11px] px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)' }}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
      style={{
        background: done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div
        className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: done ? 'var(--emerald)' : 'rgba(255,255,255,0.10)' }}
      >
        {done
          ? <Check className="h-3.5 w-3.5 text-white" />
          : <FileText className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: done ? 'var(--emerald)' : 'rgba(255,255,255,0.70)' }}>
          {rec.type}
        </p>
        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{rec.description}</p>
      </div>
      {done ? (
        <Link
          href={`/slips/upload/${slipTypeToRoute(rec.type)}`}
          className="text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
          style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--emerald)' }}
        >
          Add another
        </Link>
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/slips/upload/${slipTypeToRoute(rec.type)}`}
            className="text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.60)' }}
          >
            Upload →
          </Link>
          <button
            onClick={() => onDismiss(rec.type)}
            className="text-[11px] px-2 py-1 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.28)' }}
            title="I don't have this slip"
          >
            ✕ skip
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SlipsPage() {
  const router = useRouter();
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [editTarget, setEditTarget] = useState<SavedSlip | null>(null);
  const [activeInputTab, setActiveInputTab] = useState('upload');
  const [slipRecs, setSlipRecs] = useState<SlipRec[]>([]);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [userId, setUserId] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dismissedTypes, setDismissedTypes] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  // Load user + slips from Supabase (primary) + localStorage (fallback)
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? '';
      setUserId(uid);

      const recs = localStorage.getItem('taxagent_slip_recs');
      if (recs) {
        try { setSlipRecs(JSON.parse(recs) as SlipRec[]); } catch { /* ignore */ }
      }
      setAssessmentDone(!!localStorage.getItem('taxagent_assessment_done'));

      // Load dismissed slips from localStorage
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        try { setDismissedTypes(new Set(JSON.parse(dismissed) as string[])); } catch { /* ignore */ }
      }

      let loaded: SavedSlip[] = [];
      if (uid) {
        loaded = await getSlips(uid, 2025);
      }

      if (loaded.length > 0) {
        setSlips(loaded);
        localStorage.setItem('taxagent_slips', JSON.stringify(loaded));
      } else {
        const saved = localStorage.getItem('taxagent_slips');
        if (saved) {
          try { setSlips(JSON.parse(saved) as SavedSlip[]); } catch { /* ignore */ }
        }
      }
    }
    init().catch(() => { /* ignore */ });
  }, []);

  const syncSlips = useCallback((updated: SavedSlip[], uid: string) => {
    localStorage.setItem('taxagent_slips', JSON.stringify(updated));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (uid) {
        await upsertSlips(uid, 2025, updated);
        setLastSaved(new Date());
        toast.success('Slips saved', { duration: 1500 });
      }
    }, 800);
  }, []);

  function addSlip(type: string, issuerName: string, data: Record<string, number | string>) {
    const updated: SavedSlip[] = [
      ...slips,
      { id: crypto.randomUUID(), type, issuerName, data, enteredAt: new Date().toISOString() },
    ];
    setSlips(updated);
    setActiveInputTab('upload');
    syncSlips(updated, userId);
  }

  function updateSlip(type: string, issuerName: string, data: Record<string, number | string>) {
    if (!editTarget) return;
    const updated = slips.map((s) => s.id === editTarget.id ? { ...s, type, issuerName, data } : s);
    setSlips(updated);
    setEditTarget(null);
    syncSlips(updated, userId);
  }

  function deleteSlip(id: string) {
    const updated = slips.filter((s) => s.id !== id);
    setSlips(updated);
    syncSlips(updated, userId);
  }

  function dismissSlipType(type: string) {
    const next = new Set([...dismissedTypes, type]);
    setDismissedTypes(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  }

  function undismissSlipType(type: string) {
    const next = new Set([...dismissedTypes]);
    next.delete(type);
    setDismissedTypes(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  }

  function scrollToAddForm() {
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const enteredTypes = new Set(slips.map((s) => s.type));

  // Checklist progress: count recs that are done OR dismissed
  const recsResolved = slipRecs.filter(
    (r) => enteredTypes.has(r.type) || dismissedTypes.has(r.type),
  ).length;
  const recsTotal = slipRecs.length;
  const allRecsResolved = recsTotal > 0 && recsResolved === recsTotal;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.15em] font-semibold mb-2" style={{ color: 'var(--emerald)' }}>
              STEP 2 OF 4
            </p>
            <h1 className="text-white font-bold text-[28px] md:text-[30px] mb-2" style={{ letterSpacing: '-0.02em' }}>
              Upload your tax slips
            </h1>
            <p className="text-[15px] max-w-2xl" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Photograph or drag in any slip — T4, T5, T2202. Our OCR extracts every box and you just confirm.
              Most people are done in under 5 minutes.
            </p>
          </div>
          {lastSaved && (
            <span className="flex-shrink-0 flex items-center gap-1 text-xs pt-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
              <Cloud className="h-3 w-3" />
              {formatLastSaved(lastSaved)}
            </span>
          )}
        </div>
      </div>

      {/* ── If no assessment: prompt to start ─────────────────────── */}
      {!assessmentDone && slipRecs.length === 0 && (
        <div
          className="px-5 py-5 rounded-2xl flex items-center justify-between gap-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Complete your assessment first</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
              The AI assessment will tell you exactly which slips to upload.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-colors"
            style={{ background: 'var(--emerald)' }}
          >
            Start assessment
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Slip checklist from assessment ────────────────────────── */}
      {slipRecs.length > 0 && (
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Slips from your assessment</p>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {recsResolved}/{recsTotal} done
            </span>
          </div>
          <div className="space-y-2">
            {slipRecs.map((rec) => (
              <ChecklistItem
                key={rec.type}
                rec={rec}
                done={enteredTypes.has(rec.type)}
                dismissed={dismissedTypes.has(rec.type)}
                onDismiss={dismissSlipType}
                onUndismiss={undismissSlipType}
              />
            ))}
          </div>

          {/* Proceed CTA — shown once all checklist items are resolved */}
          {allRecsResolved && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => router.push('/calculator')}
                className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--emerald)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}
              >
                <Check className="h-4 w-4" />
                All slips done — calculate my taxes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Dashed dropzone ────────────────────────────────────────── */}
      <div
        ref={addFormRef}
        className="rounded-2xl p-6 md:p-8"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Upload className="w-5 h-5" style={{ color: 'var(--emerald)' }} />
          </div>
          <p className="text-white font-semibold text-[15px] mb-1">Drag any slip here, or click to browse</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>JPG, PNG, or PDF · up to 10MB · auto-detected</p>
        </div>

        <Tabs value={activeInputTab} onValueChange={setActiveInputTab}>
          <TabsList
            className="w-full mb-5 rounded-xl p-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <TabsTrigger
              value="upload"
              className="flex-1 rounded-lg text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
            >
              Upload Slip
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex-1 rounded-lg text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
            >
              Enter Manually
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <SlipUpload onAdd={addSlip} />
          </TabsContent>
          <TabsContent value="manual">
            <ManualEntryForm onAdd={addSlip} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Slip type grid ─────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SLIP_GRID.map(({ icon, type, desc }) => (
          <SlipTypeCard
            key={type}
            icon={icon}
            type={type}
            desc={desc}
            slipsForType={slips.filter((s) => s.type === type)}
            onUploadClick={scrollToAddForm}
          />
        ))}
      </div>

      {/* ── Entered slips list ────────────────────────────────────── */}
      {slips.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm font-semibold text-white">
              {slips.length} slip{slips.length !== 1 ? 's' : ''} entered
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {slips.map((slip) => (
              <div key={slip.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.10)' }}
                >
                  <FileText className="h-5 w-5" style={{ color: 'var(--emerald)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color: 'var(--emerald)', background: 'var(--emerald-tint)' }}
                    >
                      {slip.type}
                    </span>
                    <span className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>
                      {slip.issuerName || SLIP_TYPE_LABELS[slip.type] || slip.type}
                    </span>
                  </div>
                  {primaryAmount(slip) && (
                    <p className="text-xs tabular-nums mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{primaryAmount(slip)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditTarget(slip)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'rgba(255,255,255,0.40)' }}
                    aria-label={`Edit ${slip.type}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSlip(slip.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'rgba(255,255,255,0.40)' }}
                    aria-label={`Delete ${slip.type}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Go to calculator CTA (shown when slips exist but no checklist) ── */}
      {slips.length > 0 && slipRecs.length === 0 && (
        <button
          onClick={() => router.push('/calculator')}
          className="w-full flex items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white transition-colors"
          style={{
            background: 'var(--emerald)',
            boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
          }}
        >
          <Check className="h-4 w-4" />
          Calculate my taxes
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {/* ── Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--surface)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit {editTarget?.type} Slip</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ManualEntryForm key={editTarget.id} onAdd={updateSlip} defaultType={editTarget.type} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
