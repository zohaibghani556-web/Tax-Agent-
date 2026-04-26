'use client';

/**
 * /slips/review/[extraction_id]
 *
 * Side-by-side review of an OCR extraction.
 *
 * Desktop layout: source document (left) | extracted fields (right)
 * Mobile layout: extracted fields first, document collapsed/expandable below
 *
 * Fields with confidence < 0.85 get a yellow highlight so the user
 * knows which ones to double-check. Every changed field is recorded
 * as a correction for future model improvement.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, AlertCircle, Loader2, CheckCircle,
  AlertTriangle, ExternalLink, FileText, ChevronDown,
  ChevronUp, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SLIP_FIELDS, SLIP_TYPE_LABELS } from '@/lib/slips/slip-fields';
import { addCsrfHeader } from '@/lib/csrf-client';
import { createClient } from '@/lib/supabase/client';
import { createSlip, recordManualOverride } from '@/lib/supabase/slip-store';
import type { TaxSlipType } from '@/lib/supabase/slip-store';

// ── Types ────────────────────────────────────────────────────────────────────

interface ExtractionReview {
  id: string;
  slipType: string;
  confidence: number;
  status: string;
  boxes: Record<string, number | string>;
  flags: Array<{ field: string; reason: string; message: string }>;
  lowConfidenceFields: string[];
  reviewedAt: string | null;
  createdAt: string;
  documentUrl: string | null;
  documentType: 'image' | 'pdf';
  /** SHA-256 of the uploaded file; null if extraction predates this field. */
  fileHash: string | null;
}

interface CorrectionEntry {
  fieldName: string;
  originalValue: string | null;
  correctedValue: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.85;

const SLIP_ICONS: Record<string, string> = {
  T4: '💼', T5: '🏦', T5008: '📈', T3: '📊', T4A: '🏛',
  T2202: '🎓', T4E: '📋', T5007: '🤝', T4AP: '🍁', T4AOAS: '🍁',
  T4RSP: '💰', T4RIF: '💰', 'RRSP-Receipt': '💰', T4FHSA: '🏠',
};

// ── Document Viewer ──────────────────────────────────────────────────────────

function DocumentViewer({
  url,
  docType,
}: {
  url: string;
  docType: 'image' | 'pdf';
}) {
  const [pdfExpanded, setPdfExpanded] = useState(true);

  if (docType === 'image') {
    return (
      <div className="relative w-full overflow-auto rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Tax slip document"
          className="w-full h-auto rounded-xl"
          style={{ maxHeight: '80vh', objectFit: 'contain' }}
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)' }}
        >
          <ExternalLink className="h-3 w-3" />
          Open full size
        </a>
      </div>
    );
  }

  // PDF — iframe works on desktop + iOS Safari; link fallback for Android
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.40)' }}>
          SOURCE DOCUMENT
        </span>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
          >
            <ExternalLink className="h-3 w-3" />
            Open PDF
          </a>
          <button
            onClick={() => setPdfExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)' }}
          >
            {pdfExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {pdfExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {pdfExpanded && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
          <iframe
            src={url}
            title="Tax slip PDF"
            className="w-full"
            style={{ height: '70vh', minHeight: '400px', border: 'none' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({
  fieldKey,
  label,
  valueType,
  required,
  originalValue,
  currentValue,
  isLowConfidence,
  onChange,
}: {
  fieldKey: string;
  label: string;
  valueType: 'number' | 'text';
  required: boolean;
  originalValue: number | string | undefined;
  currentValue: number | string;
  isLowConfidence: boolean;
  onChange: (key: string, value: number | string) => void;
}) {
  const hasChanged =
    currentValue !== originalValue &&
    !(originalValue === undefined && (currentValue === 0 || currentValue === ''));

  return (
    <div
      className="space-y-1 p-3 rounded-xl transition-colors"
      style={{
        background: isLowConfidence
          ? 'rgba(245,158,11,0.07)'
          : hasChanged
          ? 'rgba(16,185,129,0.05)'
          : 'transparent',
        border: `1px solid ${
          isLowConfidence
            ? 'rgba(245,158,11,0.25)'
            : hasChanged
            ? 'rgba(16,185,129,0.20)'
            : 'rgba(255,255,255,0.06)'
        }`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Label
          htmlFor={`field-${fieldKey}`}
          className="text-xs leading-none"
          style={{ color: isLowConfidence ? '#F59E0B' : 'rgba(255,255,255,0.50)' }}
        >
          {isLowConfidence && <AlertTriangle className="inline h-3 w-3 mr-0.5 mb-0.5" />}
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {hasChanged && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--emerald)' }}
          >
            edited
          </span>
        )}
      </div>
      <Input
        id={`field-${fieldKey}`}
        type={valueType === 'number' ? 'number' : 'text'}
        value={currentValue}
        onChange={(e) => {
          const raw = e.target.value;
          // Use raw === '' guard so intentionally cleared fields stay 0 rather
          // than silently coercing NaN (garbage input) to 0. Empty → 0 is still
          // the right UI default since fieldValues is Record<string, number|string>.
          onChange(fieldKey, valueType === 'number' ? (raw === '' ? 0 : (parseFloat(raw) || 0)) : raw);
        }}
        step={valueType === 'number' ? '0.01' : undefined}
        min={valueType === 'number' ? '0' : undefined}
        className="text-sm h-9"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: isLowConfidence ? '1px solid rgba(245,158,11,0.40)' : '1px solid rgba(255,255,255,0.10)',
          color: 'white',
        }}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SlipReviewPage() {
  const params = useParams<{ extraction_id: string }>();
  const router = useRouter();
  const extractionId = params.extraction_id ?? '';

  const [extraction, setExtraction] = useState<ExtractionReview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, number | string>>({});
  const [saving, setSaving] = useState(false);
  const [showDoc, setShowDoc] = useState(false); // mobile doc toggle

  // ── Load extraction ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!extractionId) return;
    fetch(`/api/slips/review/${extractionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json() as Promise<ExtractionReview>;
      })
      .then((data) => {
        setExtraction(data);
        setFieldValues(data.boxes ?? {});
      })
      .catch(() => setLoadError('Could not load this extraction. It may have expired or been deleted.'));
  }, [extractionId]);

  // ── Field change handler ───────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: string, value: number | string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Save (with or without corrections) ────────────────────────────────────

  const save = useCallback(
    async (skipCorrections = false) => {
      if (!extraction) return;
      setSaving(true);

      // Compute field-level diffs
      const corrections: CorrectionEntry[] = [];
      if (!skipCorrections) {
        const original = extraction.boxes ?? {};
        for (const [key, newVal] of Object.entries(fieldValues)) {
          const origVal = original[key];
          const origStr = origVal !== undefined ? String(origVal) : null;
          const newStr = String(newVal);
          if (origStr !== newStr) {
            corrections.push({ fieldName: key, originalValue: origStr, correctedValue: newStr });
          }
        }
      }

      // Derive issuerName from the boxes (issuerName or institutionName)
      const issuerName =
        String(fieldValues['issuerName'] ?? fieldValues['institutionName'] ?? '');

      try {
        const res = await fetch(
          '/api/slips/corrections',
          addCsrfHeader({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              extractionId: extraction.id,
              slipType: extraction.slipType,
              issuerName,
              taxYear: 2025,
              correctedBoxes: fieldValues,
              corrections,
            }),
          }),
        );

        if (!res.ok) {
          const { error } = (await res.json()) as { error: string };
          toast.error(error ?? 'Could not save. Please try again.');
          return;
        }

        // Persist the reviewed slip to tax_slips via the unified store.
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const newSlip = await createSlip(supabase, {
              userId: user.id,
              taxYear: 2025,
              slipType: extraction.slipType as TaxSlipType,
              issuerName,
              sourceMethod: 'ocr',
              slipStatus: 'active',
              boxes: fieldValues as Record<string, number | string | null>,
              fieldProvenance: {},
              rawExtractedData: { extractionId: extraction.id },
              unmappedFields: null,
              missingRequired: [],
              // sourceExtractionId + fileHash enable createSlip dedup:
              // if the user re-saves the same review session, the existing
              // row is returned and no duplicate row is created.
              sourceExtractionId: extraction.id,
              fileHash: extraction.fileHash,
              originalFilename: null,
              schemaVersion: null,
              importedAt: new Date().toISOString(),
              extractionModel: null,
              extractionModelVersion: null,
              needsReview: false,
            });

            // Record each user correction in the audit trail.
            for (const c of corrections) {
              await recordManualOverride(
                supabase,
                newSlip.id,
                c.fieldName,
                c.originalValue !== null ? c.originalValue : null,
                c.correctedValue,
                user.id,
              );
            }
          }
        } catch {
          toast.error('Slip saved but could not write to your account history.');
        }

        toast.success(
          corrections.length > 0
            ? `${extraction.slipType} saved with ${corrections.length} correction${corrections.length !== 1 ? 's' : ''}`
            : `${extraction.slipType} confirmed`,
          { duration: 2500 },
        );
        router.replace('/slips');
      } catch {
        toast.error('Network error. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [extraction, fieldValues, router],
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (!extraction && !loadError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--emerald)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.50)' }}>Loading extraction…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
        <Link href="/slips" className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
          <ChevronLeft className="h-4 w-4" /> Back to slips
        </Link>
        <div
          className="rounded-2xl p-6 space-y-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertCircle className="h-6 w-6 text-red-400" />
          <p className="text-sm font-semibold text-red-300">{loadError}</p>
          <Link href="/slips">
            <Button variant="outline" size="sm" className="border-red-400/30 text-red-300">
              Back to slips
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { slipType, confidence, lowConfidenceFields, documentUrl, documentType, reviewedAt } = extraction!;
  const isHighConfidence = confidence >= CONFIDENCE_THRESHOLD;
  const lowConfSet = new Set(lowConfidenceFields);
  const fields = SLIP_FIELDS[slipType] ?? [];
  const slipIcon = SLIP_ICONS[slipType] ?? '📄';
  const slipLabel = SLIP_TYPE_LABELS[slipType] ?? slipType;

  // Count fields the user has edited vs original extraction
  const editedCount = Object.entries(fieldValues).filter(([key, val]) => {
    const orig = extraction!.boxes[key];
    return orig !== undefined && String(val) !== String(orig);
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/slips" className="text-sm transition-colors flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
            <ChevronLeft className="h-4 w-4" />
            Slips
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.20)' }}>/</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{slipIcon}</span>
            <div>
              <span className="text-white font-bold text-[16px]">{slipType}</span>
              <span className="text-sm ml-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{slipLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Confidence badge */}
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: isHighConfidence ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: isHighConfidence ? 'var(--emerald)' : '#F59E0B',
            }}
          >
            {isHighConfidence
              ? `✓ ${Math.round(confidence * 100)}% confidence`
              : `⚠ ${Math.round(confidence * 100)}% — review highlighted fields`}
          </span>

          {reviewedAt && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
              Previously reviewed
            </span>
          )}
        </div>
      </div>

      {/* ── Low-confidence warning banner ───────────────────────────────── */}
      {!isHighConfidence && lowConfidenceFields.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            <strong>{lowConfidenceFields.length} field{lowConfidenceFields.length !== 1 ? 's' : ''}</strong> were difficult to read from the image and are highlighted below.
            Please check them against your original slip before saving.
          </p>
        </div>
      )}

      {/* ── Split layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left: Document viewer (hidden on mobile until toggled) ──── */}
        <div className="lg:w-[55%] lg:sticky lg:top-6 lg:self-start space-y-3">
          {/* Mobile toggle */}
          <button
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)' }}
            onClick={() => setShowDoc((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {showDoc ? 'Hide source document' : 'View source document'}
            </span>
            {showDoc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <div className={`${showDoc ? 'block' : 'hidden'} lg:block`}>
            {documentUrl ? (
              <DocumentViewer url={documentUrl} docType={documentType} />
            ) : (
              <div
                className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}
              >
                <FileText className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.20)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Source document not available
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
                  The original file may have been deleted or the signed URL expired.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Extracted fields ────────────────────────────────── */}
        <div className="lg:w-[45%] space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Extracted Fields
            </p>
            {editedCount > 0 && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {editedCount} edited
              </span>
            )}
          </div>

          {fields.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
              No field definitions found for {slipType}.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <FieldRow
                  key={field.key}
                  fieldKey={field.key}
                  label={field.label}
                  valueType={field.valueType}
                  required={field.required}
                  originalValue={extraction!.boxes[field.key]}
                  currentValue={
                    fieldValues[field.key] ??
                    (field.valueType === 'number' ? 0 : '')
                  }
                  isLowConfidence={lowConfSet.has(field.key)}
                  onChange={handleFieldChange}
                />
              ))}
            </div>
          )}

          {/* ── CTA buttons ──────────────────────────────────────────── */}
          <div className="pt-2 space-y-3">
            {isHighConfidence && editedCount === 0 ? (
              // No changes + high confidence → "Looks good" path
              <Button
                onClick={() => save(true)}
                disabled={saving}
                className="w-full gap-2 py-3 text-sm font-semibold"
                style={{ background: 'var(--emerald)', color: 'white' }}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Looks good — save {slipType}
              </Button>
            ) : (
              // Has edits or low confidence → "Save corrections" path
              <Button
                onClick={() => save(false)}
                disabled={saving}
                className="w-full gap-2 py-3 text-sm font-semibold"
                style={{ background: 'var(--emerald)', color: 'white' }}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editedCount > 0
                  ? `Save with ${editedCount} correction${editedCount !== 1 ? 's' : ''}`
                  : `Confirm & save ${slipType}`}
              </Button>
            )}

            <button
              onClick={() => router.replace('/slips')}
              className="w-full text-sm py-2 rounded-full transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Discard and go back
            </button>
          </div>

          {/* Hint about corrections being used to improve the model */}
          {editedCount > 0 && (
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Your corrections help us improve extraction accuracy — thank you.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
