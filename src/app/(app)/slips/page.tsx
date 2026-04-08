'use client';

import { useState } from 'react';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { SlipUpload } from '@/components/slips/SlipUpload';
import { ManualEntryForm } from '@/components/slips/ManualEntryForm';
import {
  SLIP_TYPE_LABELS,
  SLIP_PRIMARY_BOX,
} from '@/lib/slips/slip-fields';

// ── Types ────────────────────────────────────────────────────────────────────

interface SavedSlip {
  id: string;
  type: string;
  issuerName: string;
  data: Record<string, number | string>;
  enteredAt: string;
}

// Typical number of slips for progress calculation.
// Shown as a soft target — users can have more or fewer slips.
const EXPECTED_SLIP_COUNT = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  if (typeof v === 'number' && v > 0) {
    return `${def.label}: ${formatCad(v)}`;
  }
  return '';
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SlipsPage() {
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [editTarget, setEditTarget] = useState<SavedSlip | null>(null);
  const [activeInputTab, setActiveInputTab] = useState('upload');

  // TODO: persist slips to Supabase (table: tax_slips, RLS by user_id)
  const addSlip = (
    type: string,
    issuerName: string,
    data: Record<string, number | string>
  ) => {
    const slip: SavedSlip = {
      id: crypto.randomUUID(),
      type,
      issuerName,
      data,
      enteredAt: new Date().toISOString(),
    };
    setSlips((prev) => [...prev, slip]);
    setActiveInputTab('upload'); // return to upload tab after adding
  };

  const updateSlip = (
    type: string,
    issuerName: string,
    data: Record<string, number | string>
  ) => {
    if (!editTarget) return;
    setSlips((prev) =>
      prev.map((s) =>
        s.id === editTarget.id ? { ...s, type, issuerName, data } : s
      )
    );
    setEditTarget(null);
  };

  const deleteSlip = (id: string) => {
    setSlips((prev) => prev.filter((s) => s.id !== id));
  };

  const progressPct = Math.min(
    100,
    Math.round((slips.length / EXPECTED_SLIP_COUNT) * 100)
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A2744]">Tax Slips</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Upload or manually enter your 2025 tax slips.
        </p>
      </div>

      {/* ── Progress ── */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">
              {slips.length === 0
                ? 'No slips added yet'
                : `${slips.length} slip${slips.length !== 1 ? 's' : ''} entered`}
            </span>
            <span className="text-slate-400">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {slips.length === 0 && (
            <p className="text-xs text-slate-400">
              Add all your slips to get an accurate refund calculation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Input tabs: Upload vs Manual ── */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base text-[#1A2744]">Add a Slip</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs value={activeInputTab} onValueChange={setActiveInputTab}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="upload" className="flex-1">
                Upload Slip
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
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
        </CardContent>
      </Card>

      {/* ── Slip list ── */}
      {slips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#1A2744]">Entered Slips</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-slate-100">
            {slips.map((slip) => (
              <div
                key={slip.id}
                className="flex items-center gap-4 py-4 first:pt-2"
              >
                <FileText className="h-8 w-8 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="bg-[#1A2744]/10 text-[#1A2744] font-semibold text-xs"
                    >
                      {slip.type}
                    </Badge>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {slip.issuerName || SLIP_TYPE_LABELS[slip.type] || slip.type}
                    </span>
                  </div>
                  {primaryAmount(slip) && (
                    <p className="text-xs text-slate-500 mt-0.5">{primaryAmount(slip)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${slip.type} slip`}
                    onClick={() => setEditTarget(slip)}
                  >
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${slip.type} slip`}
                    onClick={() => deleteSlip(slip.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Edit dialog ── */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1A2744]">
              Edit {editTarget?.type} Slip
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ManualEntryForm
              key={editTarget.id}
              onAdd={updateSlip}
              defaultType={editTarget.type}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
