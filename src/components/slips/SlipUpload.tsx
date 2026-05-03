'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, AlertCircle,
  X, Loader2, Shield, Clipboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLANK_EXTRACTION_MESSAGE, hasBlankExtractionFlag } from '@/lib/slips/ocr-result';
import { addCsrfHeader } from '@/lib/csrf-client';
import type { OcrResult } from '@/app/api/ocr/route';

/** Optional OCR metadata propagated from the extraction pipeline to tax_slips. */
export interface OcrSlipMeta {
  fileHash: string | null;
  sourceExtractionId: string | null;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'processing' }
  | { status: 'error'; message: string };

export function SlipUpload() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUploadState({ status: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = useCallback((file: File) => {
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
  }, []);

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
  }, [handleFile, uploadState.status]);

  useEffect(() => {
    const t = setTimeout(() => setPasteHint(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

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
      if (hasBlankExtractionFlag(result.flags)) {
        setUploadState({ status: 'error', message: BLANK_EXTRACTION_MESSAGE });
        return;
      }
      if (!result.extractionId) {
        setUploadState({ status: 'error', message: 'Extraction succeeded but could not be saved. Please try again.' });
        return;
      }
      router.replace(`/slips/review/${result.extractionId}`);
    } catch {
      setUploadState({ status: 'error', message: 'Network error. Please try again.' });
    }
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

  return null;
}
