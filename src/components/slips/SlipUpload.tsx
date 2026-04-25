'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle,
  X, Loader2, Shield, Clipboard,
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

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (uploadState.status !== 'idle' && uploadState.status !== 'error') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { e.preventDefault(); handleFile(file); return; }
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
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
      setFormValues(mergeOcrValues(type, { ...result.boxes, [issuerKey]: result.issuerName }));
      setUploadState({ status: 'extracted', result });
    } catch {
      setUploadState({ status: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handleFieldChange = (key: string, raw: string, valueType: 'number' | 'text') => {
    setFormValues((prev) => ({
      ...prev,
      [key]: valueType === 'number'
        ? (raw === '' ? '' : (isNaN(parseFloat(raw)) ? '' : parseFloat(raw)))
        : raw,
    }));
  };

  const handleSave = () => {
    const issuerKey = selectedType === 'T2202' ? 'institutionName' : 'issuerName';
    onAdd(selectedType, String(formValues[issuerKey] ?? ''), formValues);
    reset();
  };

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (uploadState.status === 'idle') {
    return (
      <div className="space-y-3">
        <div
          role="button" tabIndex={0}
          aria-label="Upload tax slip — click, drag a file, or paste a screenshot"
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
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
          <div className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Clipboard className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-300">Got a screenshot? Just paste it.</p>
              <p className="text-xs text-white/40 mt-0.5">
                Press{' '}
                <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>⌘V</kbd>
                {' '}(Mac) or{' '}
                <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>Ctrl+V</kbd>
                {' '}(Windows) anywhere on this page.
              </p>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <p className="text-xs text-white/25 text-center flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" /> PDF, PNG, JPG, WebP — max 10 MB
        </p>
      </div>
    );
  }

  // ── File selected ─────────────────────────────────────────────────────────────
  if (uploadState.status === 'selected') {
    return (
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
          <Shield className="h-4 w-4" /> Read this slip with AI
        </Button>
        <p className="text-xs text-white/30 text-center">AI reads every box and extracts the dollar amounts for you</p>
      </div>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────────
  if (uploadState.status === 'processing') {
    return (
      <div className="rounded-xl p-12 flex flex-col items-center gap-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
        <div className="rounded-xl p-5 space-y-3"
          style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">Could not read this document</p>
              <p className="text-sm text-red-400/80 mt-0.5">{uploadState.message}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="border-red-400/30 text-red-300">Try again</Button>
        </div>
        <p className="text-xs text-white/25 text-center">
          Tip: paste a screenshot with{' '}
          <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>⌘V</kbd>
        </p>
      </div>
    );
  }

  // ── Extracted ─────────────────────────────────────────────────────────────────
  //
  // All fields shown in a card grid so every box is visible at a glance.
  // Extracted boxes have large, readable inputs.
  // Not-found boxes are dimmed — visible so nothing is missed, but clearly absent.
  // Low-confidence boxes are highlighted amber so the user knows exactly what to check.
  //
  const result = uploadState.result;
  const confidence = result.confidence;
  const isHighConfidence = confidence >= HIGH_CONFIDENCE;
  const icon = SLIP_TYPE_ICONS[selectedType] ?? '📄';
  const slipLabel = SLIP_TYPE_LABELS[selectedType] ?? selectedType;
  const fields = SLIP_FIELDS[selectedType] ?? [];
  const lowConfFields = new Set(result.lowConfidenceFields);
  const issuerKey = selectedType === 'T2202' ? 'institutionName' : 'issuerName';

  // A field was "found" if formValues has a value for it, or it's the issuer field
  // (which is always populated from OCR metadata even if empty).
  const foundKeys = new Set([
    ...Object.keys(formValues),
    issuerKey,
  ]);

  return (
    <div className="space-y-5">

      {/* ── Slip identity + confidence ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <span className="text-2xl leading-none shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{slipLabel}</p>
          <p className="text-[11px] text-white/40 mt-0.5">Tax year {result.taxYear}</p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            background: isHighConfidence ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: isHighConfidence ? 'var(--emerald)' : '#F59E0B',
          }}>
          {isHighConfidence ? `✓ ${Math.round(confidence * 100)}% read` : `⚠ ${Math.round(confidence * 100)}% — check values`}
        </span>
      </div>

      {/* ── Low-confidence warning ─────────────────────────────────────────── */}
      {result.lowConfidenceFields.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            {result.lowConfidenceFields.length === 1 ? '1 value was' : `${result.lowConfidenceFields.length} values were`}
            {' '}hard to read from the image — highlighted in orange below. Please verify before saving.
          </p>
        </div>
      )}

      {/* ── All boxes — card grid ──────────────────────────────────────────── */}
      {/*
        Every field defined for this slip type is shown so nothing can be missed.
        Fields OCR found:     solid card, value pre-filled, editable.
        Fields OCR missed:    dimmed card, placeholder "not found", still editable
                              in case the user needs to add it manually.
        Low-confidence:       amber border and label.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((field) => {
          const found = foundKeys.has(field.key);
          const isUncertain = lowConfFields.has(field.key);

          // Card appearance changes based on state
          const cardBg = isUncertain
            ? 'rgba(245,158,11,0.07)'
            : found
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.015)';
          const cardBorder = isUncertain
            ? '1px solid rgba(245,158,11,0.30)'
            : found
            ? '1px solid rgba(255,255,255,0.09)'
            : '1px dashed rgba(255,255,255,0.07)';

          const labelColor = isUncertain
            ? 'text-amber-300/90'
            : found
            ? 'text-white/55'
            : 'text-white/25';

          const inputClass = [
            'w-full h-11 text-base font-mono',
            field.valueType === 'number' ? 'text-right' : 'text-left',
            isUncertain
              ? 'bg-amber-400/5 border-amber-400/35 text-amber-100 focus-visible:ring-amber-400/30'
              : found
              ? 'bg-white/5 border-white/10 text-white'
              : 'bg-transparent border-white/6 text-white/30 placeholder:text-white/15',
          ].join(' ');

          return (
            <div key={field.key} className="rounded-xl p-3.5 flex flex-col gap-2"
              style={{ background: cardBg, border: cardBorder }}>

              {/* Label row */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`ocr-${field.key}`}
                  className={`text-xs font-medium leading-tight cursor-pointer ${labelColor}`}>
                  {isUncertain && <span className="mr-1 font-bold">⚠</span>}
                  {field.label}
                  {field.required && <span className="text-red-400/70 ml-1">*</span>}
                </label>
                {!found && (
                  <span className="text-[10px] text-white/20 font-medium shrink-0">not found</span>
                )}
              </div>

              {/* Value input — full width, tall enough to read comfortably */}
              <Input
                id={`ocr-${field.key}`}
                type={field.valueType === 'number' ? 'number' : 'text'}
                placeholder={found ? (field.valueType === 'number' ? '0.00' : '') : '—'}
                value={formValues[field.key] ?? ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value, field.valueType)}
                className={inputClass}
                step={field.valueType === 'number' ? '0.01' : undefined}
                min={field.valueType === 'number' ? '0' : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* ── Save / Cancel ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <Button onClick={handleSave}
          className="flex-1 bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] gap-2">
          <CheckCircle className="h-4 w-4" />
          {isHighConfidence ? `Save ${selectedType} slip` : 'Confirm & save'}
        </Button>
        <Button variant="outline" onClick={reset}
          className="border-white/10 text-white/50 hover:text-white">
          Cancel
        </Button>
      </div>
    </div>
  );
}
