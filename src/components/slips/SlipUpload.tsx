'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle,
  X, Loader2, Shield, Clipboard, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SLIP_FIELDS,
  SLIP_TYPE_LABELS,
  mergeOcrValues,
} from '@/lib/slips/slip-fields';
import type { OcrResult } from '@/app/api/ocr/route';

interface SlipUploadProps {
  onAdd: (type: string, issuerName: string, data: Record<string, number | string>) => void;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'processing' }
  | { status: 'extracted'; result: OcrResult }
  | { status: 'error'; message: string };

const HIGH_CONFIDENCE = 0.85;
const LOW_CONFIDENCE = 0.65;

const SLIP_TYPE_ICONS: Record<string, string> = {
  T4: '💼', T5: '🏦', T5008: '📈', T3: '📊', T4A: '🏛',
  T2202: '🎓', T4E: '📋', T5007: '🤝', T4AP: '🍁', T4AOAS: '🍁',
  T4RSP: '💰', T4RIF: '💰', 'RRSP-Receipt': '💰', T4FHSA: '🏠',
};

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 2,
  }).format(n);
}

/**
 * The fields that matter most for a quick sanity-check summary per slip type.
 * We show these prominently after OCR so the user can immediately confirm
 * the key numbers were read correctly — without needing to open "all fields".
 */
const KEY_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  T4: [
    { key: 'box14', label: 'Employment income' },
    { key: 'box22', label: 'Tax withheld' },
    { key: 'box16', label: 'CPP contributions' },
    { key: 'box18', label: 'EI premiums' },
  ],
  T5: [
    { key: 'box13', label: 'Interest income' },
    { key: 'box25', label: 'Taxable eligible dividends' },
    { key: 'box11', label: 'Taxable non-eligible dividends' },
  ],
  T5008: [
    { key: 'box21', label: 'Proceeds (sold for)' },
    { key: 'box20', label: 'Cost / ACB (paid)' },
    { key: 'box16', label: 'Security' },
  ],
  T3: [
    { key: 'box21', label: 'Capital gains' },
    { key: 'box49', label: 'Interest' },
    { key: 'box22', label: 'Eligible dividends' },
  ],
  T4A: [
    { key: 'box016', label: 'Pension income' },
    { key: 'box022', label: 'Tax withheld' },
    { key: 'box028', label: 'Other income' },
  ],
  T2202: [
    { key: 'boxA', label: 'Tuition fees' },
    { key: 'boxC', label: 'Full-time months' },
    { key: 'boxB', label: 'Part-time months' },
  ],
  T4E: [
    { key: 'box14', label: 'EI benefits received' },
    { key: 'box22', label: 'Tax withheld' },
  ],
  T4AP: [
    { key: 'box16', label: 'CPP pension amount' },
    { key: 'box22', label: 'Tax withheld' },
  ],
  T4AOAS: [
    { key: 'box18', label: 'OAS pension' },
    { key: 'box22', label: 'Tax withheld' },
  ],
  T4RSP: [
    { key: 'box22', label: 'RRSP income withdrawn' },
    { key: 'box30', label: 'Tax withheld' },
  ],
  T4RIF: [
    { key: 'box16', label: 'RRIF income' },
    { key: 'box30', label: 'Tax withheld' },
  ],
  'RRSP-Receipt': [
    { key: 'amount', label: 'Contribution amount' },
    { key: 'planType', label: 'Plan type' },
  ],
  T4FHSA: [
    { key: 'box24', label: 'FHSA contributions' },
    { key: 'box14', label: 'Taxable income' },
  ],
  T5007: [
    { key: 'box10', label: 'Social assistance payments' },
  ],
};

export function SlipUpload({ onAdd }: SlipUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, number | string>>({});
  const [selectedType, setSelectedType] = useState('T4');
  const [showAllFields, setShowAllFields] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUploadState({ status: 'idle' });
    setFormValues({});
    setShowAllFields(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadState({ status: 'error', message: 'Unsupported file type. Use PNG, JPG, WebP, or PDF.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadState({ status: 'error', message: 'File too large. Maximum 10 MB.' });
      return;
    }
    setUploadState({ status: 'selected', file });
  };

  // ── Clipboard paste support (Cmd+V / Ctrl+V with a screenshot) ──────────
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      // Only intercept paste when we're in idle or error state
      if (uploadState.status !== 'idle' && uploadState.status !== 'error') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            return;
          }
        }
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState.status]);

  // Show paste hint briefly on focus so users discover the shortcut
  useEffect(() => {
    const t = setTimeout(() => setPasteHint(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const runOcr = async () => {
    if (uploadState.status !== 'selected') return;
    setUploadState({ status: 'processing' });

    const fd = new FormData();
    fd.append('file', uploadState.file);

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setUploadState({ status: 'error', message: error ?? 'Could not read this document.' });
        return;
      }
      const result = (await res.json()) as OcrResult;
      const knownTypes = Object.keys(SLIP_TYPE_LABELS);
      const type = knownTypes.includes(result.slipType) ? result.slipType : 'T4';
      setSelectedType(type);

      const issuerKey = type === 'T2202' ? 'institutionName' : 'issuerName';
      const merged = mergeOcrValues(type, {
        ...result.boxes,
        [issuerKey]: result.issuerName,
      });
      setFormValues(merged);
      setUploadState({ status: 'extracted', result });
    } catch {
      setUploadState({ status: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handleFieldChange = (key: string, raw: string, valueType: 'number' | 'text') => {
    setFormValues((prev) => ({
      ...prev,
      [key]: valueType === 'number' ? (parseFloat(raw) || 0) : raw,
    }));
  };

  const handleSave = () => {
    const issuerKey = selectedType === 'T2202' ? 'institutionName' : 'issuerName';
    const issuerName = String(formValues[issuerKey] ?? '');
    onAdd(selectedType, issuerName, formValues);
    reset();
  };

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (uploadState.status === 'idle') {
    return (
      <div className="space-y-3">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload tax slip — click, drag a file, or paste a screenshot"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          className="rounded-xl p-10 text-center cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${isDragging ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)'}`,
            background: isDragging ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <Upload className="mx-auto mb-3 h-9 w-9 text-white/30" />
          <p className="text-base font-semibold text-white/70">Drop your slip here</p>
          <p className="mt-1 text-sm text-white/40">or click to browse</p>
        </div>

        {/* Paste hint — the key discovery moment */}
        {pasteHint && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Clipboard className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-300">
                Got a screenshot? Just paste it.
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Screenshot your CRA My Account slip, then press{' '}
                <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>⌘V</kbd>
                {' '}(Mac) or{' '}
                <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>Ctrl+V</kbd>
                {' '}(Windows) anywhere on this page.
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <p className="text-xs text-white/25 text-center flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" />
          PDF, PNG, JPG, WebP — max 10 MB
        </p>
      </div>
    );
  }

  // ── File selected ────────────────────────────────────────────────────────────
  if (uploadState.status === 'selected') {
    return (
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-white/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">{uploadState.file.name}</p>
            <p className="text-xs text-white/40">{(uploadState.file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={reset} className="text-white/30 hover:text-white/60 transition-colors" aria-label="Remove file">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={runOcr} className="w-full bg-[#10B981] hover:bg-[#059669] gap-2">
          <Shield className="h-4 w-4" />
          Read this slip with AI
        </Button>
        <p className="text-xs text-white/30 text-center">
          AI reads every box and extracts the dollar amounts for you
        </p>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  if (uploadState.status === 'processing') {
    return (
      <div className="rounded-xl p-12 flex flex-col items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-white/80">Reading your slip…</p>
          <p className="text-xs text-white/40 mt-1">Identifying all boxes and amounts</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (uploadState.status === 'error') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl p-5 space-y-3" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">Could not read this document</p>
              <p className="text-sm text-red-400/80 mt-0.5">{uploadState.message}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="border-red-400/30 text-red-300">
            Try again
          </Button>
        </div>
        <p className="text-xs text-white/25 text-center">
          Tip: you can also paste a screenshot with{' '}
          <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>⌘V</kbd>
        </p>
      </div>
    );
  }

  // ── Extracted ────────────────────────────────────────────────────────────────
  const result = uploadState.result;
  const confidence = result.confidence;
  const isHighConfidence = confidence >= HIGH_CONFIDENCE;
  const isLowConfidence = confidence < LOW_CONFIDENCE;
  const icon = SLIP_TYPE_ICONS[selectedType] ?? '📄';
  const slipLabel = SLIP_TYPE_LABELS[selectedType] ?? selectedType;
  const fields = SLIP_FIELDS[selectedType] ?? [];
  const lowConfFields = new Set(result.lowConfidenceFields);
  const keyFields = KEY_FIELDS[selectedType] ?? [];

  // Key fields that have non-zero / non-empty values — the "what was read" view
  const readableKeyFields = keyFields.filter(({ key }) => {
    const v = formValues[key];
    return v !== undefined && v !== '' && v !== 0;
  });

  return (
    <div className="space-y-4">

      {/* ── What was read — the most important section ─────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.25)' }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{slipLabel}</p>
            {result.issuerName && (
              <p className="text-xs text-white/50 truncate">{result.issuerName}</p>
            )}
          </div>
          {/* Confidence badge */}
          <span
            className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
            style={{
              background: isHighConfidence
                ? 'rgba(16,185,129,0.15)'
                : isLowConfidence
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(255,255,255,0.08)',
              color: isHighConfidence ? '#10B981' : isLowConfidence ? '#F59E0B' : 'rgba(255,255,255,0.6)',
            }}
          >
            {isHighConfidence ? '✓ Clear read' : isLowConfidence ? '⚠ Needs review' : `${Math.round(confidence * 100)}%`}
          </span>
        </div>

        {/* Extracted values — shown immediately, no click required */}
        {readableKeyFields.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {readableKeyFields.map(({ key, label }) => {
              const raw = formValues[key];
              const isUncertain = lowConfFields.has(key);
              const displayValue =
                typeof raw === 'number'
                  ? formatCad(raw)
                  : String(raw);

              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: isUncertain ? 'rgba(245,158,11,0.05)' : undefined }}
                >
                  <span className={`text-sm ${isUncertain ? 'text-amber-300' : 'text-white/60'}`}>
                    {isUncertain && <span className="mr-1">⚠</span>}
                    {label}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${isUncertain ? 'text-amber-300' : 'text-white'}`}>
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-4">
            {result.summary ? (
              <p className="text-sm text-white/60 leading-relaxed">{result.summary}</p>
            ) : (
              <p className="text-sm text-white/40 italic">No values extracted — check the fields below.</p>
            )}
          </div>
        )}

        {/* Plain-English summary beneath the values */}
        {result.summary && readableKeyFields.length > 0 && (
          <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-white/40 pt-3 leading-relaxed">{result.summary}</p>
          </div>
        )}
      </div>

      {/* ── Warning for low confidence ──────────────────────────────────────── */}
      {isLowConfidence && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            Some values were hard to read from the image — the ones marked ⚠ above may be wrong.
            Check them in the fields below before saving.
          </p>
        </div>
      )}

      {/* ── All fields (expandable for high confidence, always shown for low) ─ */}
      {isLowConfidence || showAllFields ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            {isLowConfidence ? 'Review all extracted values' : 'All extracted values'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((field) => {
              const isUncertain = lowConfFields.has(field.key);
              return (
                <div key={field.key} className="space-y-1">
                  <Label
                    htmlFor={`ocr-${field.key}`}
                    className={`text-xs ${isUncertain ? 'text-amber-400' : 'text-white/50'}`}
                  >
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                    {isUncertain && <span className="ml-1 text-amber-400 font-semibold">⚠ check this</span>}
                  </Label>
                  <Input
                    id={`ocr-${field.key}`}
                    type={field.valueType === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder ?? (field.valueType === 'number' ? '0' : '')}
                    value={formValues[field.key] ?? (field.valueType === 'number' ? 0 : '')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value, field.valueType)}
                    className={`text-sm bg-white/5 border-white/10 text-white ${isUncertain ? 'border-amber-400/50' : ''}`}
                    step={field.valueType === 'number' ? '0.01' : undefined}
                    min={field.valueType === 'number' ? '0' : undefined}
                  />
                </div>
              );
            })}
          </div>
          {showAllFields && (
            <button
              onClick={() => setShowAllFields(false)}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Hide fields
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAllFields(true)}
          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Edit individual values
        </button>
      )}

      {/* ── Save / Cancel ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <Button
          onClick={handleSave}
          className="flex-1 bg-[#10B981] hover:bg-[#059669] gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {isHighConfidence ? 'Save this slip' : 'Confirm & save'}
        </Button>
        <Button
          variant="outline"
          onClick={reset}
          className="border-white/10 text-white/50 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
