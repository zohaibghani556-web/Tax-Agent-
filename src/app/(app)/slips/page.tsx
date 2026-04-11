'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Trash2, FileText, Check, ArrowRight, ChevronRight, Cloud } from 'lucide-react';
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

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function formatLastSaved(date: Date | null): string {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just saved';
  if (diffMin < 60) return `${diffMin} min ago`;
  return date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

export default function SlipsPage() {
  const router = useRouter();
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [editTarget, setEditTarget] = useState<SavedSlip | null>(null);
  const [activeInputTab, setActiveInputTab] = useState('upload');
  const [slipRecs, setSlipRecs] = useState<SlipRec[]>([]);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [userId, setUserId] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Load from Supabase first
      let loaded: SavedSlip[] = [];
      if (uid) {
        loaded = await getSlips(uid, 2025);
      }

      if (loaded.length > 0) {
        // DB is the source of truth
        setSlips(loaded);
        localStorage.setItem('taxagent_slips', JSON.stringify(loaded));
      } else {
        // Fall back to localStorage
        const saved = localStorage.getItem('taxagent_slips');
        if (saved) {
          try { setSlips(JSON.parse(saved) as SavedSlip[]); } catch { /* ignore */ }
        }
      }
    }
    init().catch(() => { /* ignore */ });
  }, []);

  // Debounced sync to Supabase + localStorage on every slip change
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

  // Which recommended slip types have been entered already
  const enteredTypes = new Set(slips.map((s) => s.type));
  const recsDone = slipRecs.filter((r) => enteredTypes.has(r.type)).length;
  const recsTotal = slipRecs.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Tax Slips</h1>
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-white/30">
              <Cloud className="h-3 w-3" />
              {formatLastSaved(lastSaved)}
            </span>
          )}
        </div>
        <p className="text-white/40 mt-1 text-sm">
          Upload or manually enter your 2025 CRA slips.
        </p>
      </div>

      {/* ── If no assessment: prompt to start ─────────────────────── */}
      {!assessmentDone && slipRecs.length === 0 && (
        <GlassCard className="px-5 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Complete your assessment first</p>
            <p className="text-xs text-white/40 mt-0.5">
              The AI assessment will tell you exactly which slips to upload.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-[#10B981] px-4 py-2 text-xs font-semibold text-white hover:bg-[#059669] transition-colors"
          >
            Start assessment
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </GlassCard>
      )}

      {/* ── Slip checklist from assessment ────────────────────────── */}
      {slipRecs.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Slips from your assessment</p>
            <span className="text-xs text-white/40">{recsDone}/{recsTotal} uploaded</span>
          </div>
          <div className="space-y-2">
            {slipRecs.map((rec) => {
              const done = enteredTypes.has(rec.type);
              return (
                <div
                  key={rec.type}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#10B981]' : 'bg-white/10'}`}>
                    {done ? <Check className="h-3.5 w-3.5 text-white" /> : <FileText className="h-3.5 w-3.5 text-white/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${done ? 'text-[#10B981]' : 'text-white/70'}`}>{rec.type}</p>
                    <p className="text-xs text-white/40 truncate">{rec.description}</p>
                  </div>
                  {!done && (
                    <span className="text-[10px] text-white/30 text-right max-w-[120px] leading-tight">
                      {rec.where}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Upload / Manual entry ─────────────────────────────────── */}
      <GlassCard className="p-5">
        <p className="text-sm font-semibold text-white mb-4">Add a Slip</p>
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
      </GlassCard>

      {/* ── Entered slips list ────────────────────────────────────── */}
      {slips.length > 0 && (
        <GlassCard className="overflow-hidden">
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
                  style={{ background: 'rgba(16,185,129,0.1)' }}
                >
                  <FileText className="h-5 w-5 text-[#10B981]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full text-[#10B981]"
                      style={{ background: 'rgba(16,185,129,0.12)' }}
                    >
                      {slip.type}
                    </span>
                    <span className="text-sm text-white/70 truncate">
                      {slip.issuerName || SLIP_TYPE_LABELS[slip.type] || slip.type}
                    </span>
                  </div>
                  {primaryAmount(slip) && (
                    <p className="text-xs text-white/40 mt-0.5">{primaryAmount(slip)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditTarget(slip)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={`Edit ${slip.type}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSlip(slip.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label={`Delete ${slip.type}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Go to calculator CTA ─────────────────────────────────── */}
      {slips.length > 0 && (
        <button
          onClick={() => router.push('/calculator')}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-colors"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <Check className="h-4 w-4 text-[#10B981]" />
          Calculate my taxes
          <ArrowRight className="h-4 w-4 text-[#10B981]" />
        </button>
      )}

      {/* ── Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1828] border-white/10">
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
