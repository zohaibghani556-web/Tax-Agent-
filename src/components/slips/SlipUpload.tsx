'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle,
  X, Loader2, Shield, Clipboard, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SLIP_FIELDS,
  SLIP_TYPE_LABELS,
  mergeOcrValues,
} from '@/lib/slips/slip-fields';
import { addCsrfHeader } from '@/lib/csrf-client';
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

const SLIP_TYPE_ICONS: Record<string, string> = {
  T4: '💼', T5: '🏦', T5008: '📈', T3: '📊', T4A: '🏛',
  T2202: '🎓', T4E: '📋', T5007: '🤝', T4AP: '🍁', T4AOAS: '🍁',
  T4RSP: '💰', T4RIF: '💰', 'RRSP-Receipt': '💰', T4FHSA: '🏠',
};

export function SlipUpload({ onAdd }: SlipUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, number | string>>({});
  const [selectedType, setSelectedType] = useState('T4');
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUploadState({ status: 'idle' });
    setFormValues({});
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
      const res = await fetch('/api/ocr', addCsrfHeader({ method: 'POST', body: fd }));
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
      [key]: valueType === 'number' ? (raw === '' ? '' : (isNaN(parseFloat(raw)) ? '' : parseFloat(raw))) : raw,
    }));
  };

  const handleSave = () => {
    const issuerKey = selectedType === 'T2202' ? 'institutionName' : 'issuerName';
    const issuerName = String(formValues[issuerKey] ?? '');
    onAdd(selectedType, issuerName, formValues);
    reset();
  };

  // ── Idle ─────────────────────────────────────────────────────────────────────
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

        {pasteHint && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Clipboard className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-300">Got a screenshot? Just paste it.</p>
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

  // ── File selected ─────────────────────────────────────────────────────────────
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
        <Button onClick={runOcr} className="w-full bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] gap-2">
          <Shield className="h-4 w-4" />
          Read this slip with AI
        </Button>
        <p className="text-xs text-white/30 text-center">
          AI reads every box and extracts the dollar amounts for you
        </p>
      </div>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────────
  if (uploadState.status === 'processing') {
    return (
      <div className="rounded-xl p-12 flex flex-col items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--emerald)]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-white/80">Reading your slip…</p>
          <p className="text-xs text-white/40 mt-1">Identifying all boxes and amounts</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
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

  // ── Extracted ─────────────────────────────────────────────────────────────────
  //
  // Design goals:
  //   1. Every extracted box is immediately visible as an inline-editable field.
  //   2. Low-confidence fields are highlighted per-row so the user knows exactly
  //      which values to double-check — no hunting.
  //   3. Boxes not found on this slip are collapsed by default so they don't
  //      clutter the review, but remain accessible if the user needs to add one.
  //   4. One click to save once the user is satisfied.
  //
  const result = uploadState.result;
  const confidence = result.confidence;
  const isHighConfidence = confidence >= HIGH_CONFIDENCE;
  const icon = SLIP_TYPE_ICONS[selectedType] ?? '📄';
  const slipLabel = SLIP_TYPE_LABELS[selectedType] ?? selectedType;
  const fields = SLIP_FIELDS[selectedType] ?? [];
  const lowConfFields = new Set(result.lowConfidenceFields);

  // The issuer/institution field is populated from OCR metadata, not result.boxes.
  const issuerKey = selectedType === 'T2202' ? 'institutionName' : 'issuerName';

  // "Extracted" = has a value in formValues (including the issuer field).
  // "Missing"   = no value found; collapsed accordion, user can fill manually.
  const extractedFields = fields.filter(f =>
    formValues[f.key] !== undefined || f.key === issuerKey
  );
  const missingFields = fields.filter(f =>
    formValues[f.key] === undefined && f.key !== issuerKey
  );

  return (
    <div className="space-y-4">

      {/* ── Slip identity header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <span className="text-[22px] leading-none shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug truncate">{slipLabel}</p>
          <p className="text-[11px] text-white/40 mt-0.5">{result.taxYear}</p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            background: isHighConfidence ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: isHighConfidence ? 'var(--emerald)' : '#F59E0B',
          }}
        >
          {isHighConfidence
            ? `✓ ${Math.round(confidence * 100)}% read`
            : `⚠ ${Math.round(confidence * 100)}% — check values`}
        </span>
      </div>

      {/* ── Extracted boxes — inline-editable, one row per box ───────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-2 px-0.5">
          {extractedFields.length} box{extractedFields.length !== 1 ? 'es' : ''} extracted
        </p>
        <div
          className="rounded-xl overflow-hidden divide-y"
          style={{ border: '1px solid rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {extractedFields.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-sm text-white/40 italic">
                Nothing was extracted — try uploading a clearer image or select the correct slip type manually.
              </p>
            </div>
          ) : (
            extractedFields.map((field) => {
              const isUncertain = lowConfFields.has(field.key);
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ background: isUncertain ? 'rgba(245,158,11,0.06)' : undefined }}
                >
                  <label
                    htmlFor={`ocr-ext-${field.key}`}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <span className={`text-xs leading-none ${isUncertain ? 'text-amber-300/90' : 'text-white/55'}`}>
                      {isUncertain && (
                        <span className="mr-1 text-amber-400 font-bold">⚠</span>
                      )}
                      {field.label}
                      {field.required && (
                        <span className="text-red-400/60 ml-1">*</span>
                      )}
                    </span>
                  </label>
                  <Input
                    id={`ocr-ext-${field.key}`}
                    type={field.valueType === 'number' ? 'number' : 'text'}
                    placeholder="—"
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value, field.valueType)}
                    className={[
                      'w-40 text-right text-sm font-mono h-8',
                      'bg-white/5 text-white placeholder:text-white/20',
                      isUncertain
                        ? 'border-amber-400/40 focus-visible:ring-amber-400/30'
                        : 'border-white/10',
                    ].join(' ')}
                    step={field.valueType === 'number' ? '0.01' : undefined}
                    min={field.valueType === 'number' ? '0' : undefined}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Not-found boxes — collapsed accordion, add manually if needed ─── */}
      {missingFields.length > 0 && (
        <details className="group">
          <summary
            className="flex items-center gap-2 cursor-pointer select-none list-none px-0.5"
            style={{ ['WebkitListStyle' as string]: 'none' }}
          >
            <ChevronDown
              className="h-3.5 w-3.5 text-white/30 group-open:text-white/50 transition-transform group-open:rotate-180 shrink-0"
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 group-open:text-white/50 transition-colors">
              {missingFields.length} box{missingFields.length !== 1 ? 'es' : ''} not found on this slip
            </span>
            <span className="text-[11px] normal-case font-normal text-white/20 tracking-normal ml-0.5">
              — expand to add manually
            </span>
          </summary>

          <div
            className="mt-2 rounded-xl overflow-hidden divide-y"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {missingFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ opacity: 0.55 }}
              >
                <label
                  htmlFor={`ocr-miss-${field.key}`}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <span className="text-xs text-white/45">{field.label}</span>
                </label>
                <Input
                  id={`ocr-miss-${field.key}`}
                  type={field.valueType === 'number' ? 'number' : 'text'}
                  placeholder="not found"
                  value={formValues[field.key] ?? ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value, field.valueType)}
                  className="w-40 text-right text-sm font-mono h-8 bg-white/3 border-white/8 text-white placeholder:text-white/20"
                  step={field.valueType === 'number' ? '0.01' : undefined}
                  min={field.valueType === 'number' ? '0' : undefined}
                />
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Low-confidence warning banner ─────────────────────────────────── */}
      {result.lowConfidenceFields.length > 0 && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            {result.lowConfidenceFields.length === 1
              ? '1 value was hard to read'
              : `${result.lowConfidenceFields.length} values were hard to read`}
            {' '}— marked ⚠ above. Double-check before saving.
          </p>
        </div>
      )}

      {/* ── Save / Cancel ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <Button
          onClick={handleSave}
          className="flex-1 bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {isHighConfidence ? `Save ${selectedType} slip` : 'Confirm & save'}
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
