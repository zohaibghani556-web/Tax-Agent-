'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const SLIP_TYPES = Object.keys(SLIP_TYPE_LABELS);

export function SlipUpload({ onAdd }: SlipUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  // Editable form values after OCR extraction
  const [formValues, setFormValues] = useState<Record<string, number | string>>({});
  const [selectedType, setSelectedType] = useState('T4');
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

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
        setUploadState({ status: 'error', message: error ?? 'OCR failed.' });
        return;
      }
      const result = (await res.json()) as OcrResult;
      const type = SLIP_TYPES.includes(result.slipType) ? result.slipType : 'T4';
      setSelectedType(type);

      // Pre-populate form with extracted values; unknown fields default to zero/empty
      const merged = mergeOcrValues(type, {
        ...result.boxes,
        issuerName: result.issuerName,
        institutionName: result.issuerName,
      });
      setFormValues(merged);
      setUploadState({ status: 'extracted', result });
    } catch {
      setUploadState({ status: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setFormValues(getEmptySlipValues(type));
  };

  const handleFieldChange = (key: string, raw: string, valueType: 'number' | 'text') => {
    setFormValues((prev) => ({
      ...prev,
      [key]: valueType === 'number' ? (parseFloat(raw) || 0) : raw,
    }));
  };

  const handleSave = () => {
    const fields = SLIP_FIELDS[selectedType] ?? [];
    // Server-side validation happens when slips feed the calculation engine.
    // Here we just ensure required fields are non-empty.
    const missing = fields
      .filter((f) => f.required)
      .filter((f) => {
        const v = formValues[f.key];
        return v === '' || v === undefined || v === null;
      });
    if (missing.length > 0) {
      return; // Keep the form open; required fields are visually marked
    }

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
          className={[
            'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-[#1A2744] bg-blue-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50',
          ].join(' ')}
        >
          <Upload className="mx-auto mb-4 h-10 w-10 text-slate-400" />
          <p className="text-base font-medium text-slate-700">
            Drag and drop your slip here
          </p>
          <p className="mt-1 text-sm text-slate-500">or click to browse</p>
          <p className="mt-3 text-xs text-slate-400">PNG, JPG, WebP, PDF — max 10 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // ── File selected — ready to extract ────────────────────────────────────
  if (uploadState.status === 'selected') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {uploadState.file.name}
            </p>
            <p className="text-xs text-slate-500">
              {(uploadState.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Remove file">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={runOcr} className="w-full bg-[#1A2744] hover:bg-[#243461]">
          Extract Data with AI
        </Button>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────
  if (uploadState.status === 'processing') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A2744]" />
        <p className="text-sm font-medium">Reading your slip...</p>
        <p className="text-xs text-slate-400">This usually takes a few seconds.</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (uploadState.status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Could not process file</p>
            <p className="text-sm text-red-600">{uploadState.message}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Extracted — editable confirmation form ───────────────────────────────
  const fields = SLIP_FIELDS[selectedType] ?? [];
  const confidence = uploadState.result.confidence;

  return (
    <div className="space-y-5">
      {/* Confidence banner */}
      <div
        className={[
          'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm',
          confidence >= 0.8
            ? 'bg-green-50 text-green-800'
            : 'bg-amber-50 text-amber-800',
        ].join(' ')}
      >
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>
          Data extracted ({Math.round(confidence * 100)}% confidence). Review and confirm before saving.
        </span>
      </div>

      {/* Slip type selector — in case OCR got it wrong */}
      <div className="space-y-1">
        <Label>Slip Type</Label>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLIP_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {SLIP_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Extracted fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`ocr-${field.key}`} className="text-xs">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`ocr-${field.key}`}
              type={field.valueType === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder}
              value={formValues[field.key] ?? (field.valueType === 'number' ? 0 : '')}
              onChange={(e) => handleFieldChange(field.key, e.target.value, field.valueType)}
              className="text-sm"
              step={field.valueType === 'number' ? '0.01' : undefined}
              min={field.valueType === 'number' ? '0' : undefined}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          onClick={handleSave}
          className="flex-1 bg-[#1A2744] hover:bg-[#243461]"
        >
          Confirm & Save Slip
        </Button>
        <Button variant="outline" onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
