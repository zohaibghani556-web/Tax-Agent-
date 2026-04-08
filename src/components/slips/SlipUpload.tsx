'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle,
  X, Loader2, ChevronDown, ChevronUp, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SLIP_FIELDS,
  SLIP_TYPE_LABELS,
  mergeOcrValues,
  getEmptySlipValues,
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

const HIGH_CONFIDENCE = 0.85; // above this → just show summary, one-tap save
const LOW_CONFIDENCE = 0.65;  // below this → show all fields for review

const SLIP_TYPE_ICONS: Record<string, string> = {
  T4: '💼',
  T5: '🏦',
  T5008: '📈',
  T3: '📊',
  T4A: '🏛',
  T2202: '🎓',
  T4E: '📋',
  T5007: '🤝',
  T4AP: '🍁',
  T4AOAS: '🍁',
  T4RSP: '💰',
  T4RIF: '💰',
  'RRSP-Receipt': '💰',
};

export function SlipUpload({ onAdd }: SlipUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, number | string>>({});
  const [selectedType, setSelectedType] = useState('T4');
  const [showAllFields, setShowAllFields] = useState(false);
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

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

  // ── Idle / file-drop zone ────────────────────────────────────────────────
  if (uploadState.status === 'idle') {
    return (
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload tax slip"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          className="rounded-xl p-12 text-center cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${isDragging ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)'}`,
            background: isDragging ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <Upload className="mx-auto mb-4 h-10 w-10 text-white/30" />
          <p className="text-base font-semibold text-white/70">Drag and drop your slip here</p>
          <p className="mt-1 text-sm text-white/40">or click to browse your files</p>
          <p className="mt-3 text-xs text-white/25">PDF, PNG, JPG, WebP — max 10 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
        <p className="text-xs text-white/30 text-center flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" />
          Read by AI — data stays on your device until you save it
        </p>
      </div>
    );
  }

  // ── File selected — ready to extract ────────────────────────────────────
  if (uploadState.status === 'selected') {
    return (
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-white/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">{uploadState.file.name}</p>
            <p className="text-xs text-white/40">{(uploadState.file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={reset} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={runOcr} className="w-full bg-[#10B981] hover:bg-[#059669] gap-2">
          <Shield className="h-4 w-4" />
          Read this slip with AI
        </Button>
        <p className="text-xs text-white/30 text-center">
          AI reads every box and tells you what it found in plain English
        </p>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────
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

  // ── Error ────────────────────────────────────────────────────────────────
  if (uploadState.status === 'error') {
    return (
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
    );
  }

  // ── Extracted — smart summary view ───────────────────────────────────────
  const result = uploadState.result;
  const confidence = result.confidence;
  const isHighConfidence = confidence >= HIGH_CONFIDENCE;
  const isLowConfidence = confidence < LOW_CONFIDENCE;
  const icon = SLIP_TYPE_ICONS[selectedType] ?? '📄';
  const slipLabel = SLIP_TYPE_LABELS[selectedType] ?? selectedType;
  const fields = SLIP_FIELDS[selectedType] ?? [];
  const lowConfFields = new Set(result.lowConfidenceFields);

  return (
    <div className="space-y-4">
      {/* Summary card — always shown */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{slipLabel}</p>
            {result.issuerName && (
              <p className="text-xs text-white/50 mt-0.5">From: {result.issuerName}</p>
            )}
            {result.summary && (
              <p className="text-sm text-white/70 mt-2 leading-relaxed">{result.summary}</p>
            )}
          </div>
        </div>

        {/* Confidence badge */}
        <div className="flex items-center gap-2">
          <CheckCircle className={`h-3.5 w-3.5 ${isHighConfidence ? 'text-[#10B981]' : isLowConfidence ? 'text-amber-400' : 'text-white/50'}`} />
          <span className={`text-xs ${isHighConfidence ? 'text-[#10B981]' : isLowConfidence ? 'text-amber-400' : 'text-white/50'}`}>
            {isHighConfidence
              ? `${Math.round(confidence * 100)}% confident — all fields read clearly`
              : isLowConfidence
              ? `${Math.round(confidence * 100)}% confident — please review the highlighted fields below`
              : `${Math.round(confidence * 100)}% confident — review before saving`}
          </span>
        </div>
      </div>

      {/* For low confidence: always show fields. For high confidence: show toggle */}
      {(isLowConfidence || showAllFields) ? (
        <div className="space-y-4">
          {isLowConfidence && (
            <p className="text-xs text-amber-400/80 px-1">
              Some fields were hard to read. Please check the highlighted ones below and correct anything that looks wrong.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((field) => {
              const isUncertain = lowConfFields.has(field.key);
              return (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`ocr-${field.key}`} className={`text-xs ${isUncertain ? 'text-amber-400' : 'text-white/50'}`}>
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                    {isUncertain && <span className="ml-1 text-amber-400">⚠ check this</span>}
                  </Label>
                  <Input
                    id={`ocr-${field.key}`}
                    type={field.valueType === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder}
                    value={formValues[field.key] ?? (field.valueType === 'number' ? 0 : '')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value, field.valueType)}
                    className={`text-sm bg-white/5 border-white/10 text-white ${isUncertain ? 'border-amber-400/40' : ''}`}
                    step={field.valueType === 'number' ? '0.01' : undefined}
                    min={field.valueType === 'number' ? '0' : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAllFields(true)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Show all extracted fields
        </button>
      )}

      {showAllFields && (
        <button
          onClick={() => setShowAllFields(false)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Hide fields
        </button>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          onClick={handleSave}
          className="flex-1 bg-[#10B981] hover:bg-[#059669] gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {isHighConfidence ? 'Save this slip' : 'Confirm & save slip'}
        </Button>
        <Button
          variant="outline"
          onClick={reset}
          className="border-white/10 text-white/50 hover:text-white"
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-white/25 text-center">
        The AI has already calculated everything — you don&apos;t need to understand the box numbers
      </p>
    </div>
  );
}
