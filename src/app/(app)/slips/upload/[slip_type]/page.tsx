'use client';

/**
 * /slips/upload/[slip_type]
 *
 * Dedicated upload page for a single slip type.
 * - Drag-drop / file picker / clipboard paste
 * - Calls /api/ocr after file is selected
 * - Redirects to /slips/review/[extraction_id] on success
 * - On failure: shows error with retry option
 *
 * Supports all 14 slip types. If [slip_type] is unrecognised,
 * falls back to the generic uploader (type auto-detected by OCR).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, FileText, X, Loader2, AlertCircle,
  ChevronLeft, Shield, Clipboard, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SLIP_TYPE_LABELS } from '@/lib/slips/slip-fields';
import { addCsrfHeader } from '@/lib/csrf-client';
import type { OcrResult } from '@/app/api/ocr/route';

// ── Constants ────────────────────────────────────────────────────────────────

const SLIP_ICONS: Record<string, string> = {
  T4: '💼', T5: '🏦', T5008: '📈', T3: '📊', T4A: '🏛',
  T2202: '🎓', T4E: '📋', T5007: '🤝', T4AP: '🍁', T4AOAS: '🍁',
  T4RSP: '💰', T4RIF: '💰', 'RRSP-Receipt': '💰', T4FHSA: '🏠',
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// ── Types ────────────────────────────────────────────────────────────────────

type PageState =
  | { phase: 'idle' }
  | { phase: 'selected'; file: File }
  | { phase: 'processing' }
  | { phase: 'done'; extractionId: string }
  | { phase: 'error'; message: string };

// ── Component ────────────────────────────────────────────────────────────────

export default function SlipUploadPage() {
  const params = useParams<{ slip_type: string }>();
  const router = useRouter();

  // URL param uses lower-kebab; normalize to display form (e.g. "t4" → "T4")
  const rawType = params.slip_type ?? '';
  const slipType = rawType.toUpperCase().replace(/-/g, '_').replace(/_RECEIPT$/, '-Receipt');
  const slipLabel = SLIP_TYPE_LABELS[slipType] ?? slipType;
  const slipIcon = SLIP_ICONS[slipType] ?? '📄';

  const [state, setState] = useState<PageState>({ phase: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show paste hint after a short delay to surface the shortcut
  useEffect(() => {
    const t = setTimeout(() => setPasteHint(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Clipboard paste support (Cmd+V / Ctrl+V screenshot)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (state.phase !== 'idle' && state.phase !== 'error') return;
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
  }, [state.phase]);

  // Redirect as soon as we have an extraction ID
  useEffect(() => {
    if (state.phase === 'done') {
      router.replace(`/slips/review/${state.extractionId}`);
    }
  }, [state, router]);

  function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setState({ phase: 'error', message: 'Unsupported file type. Use PNG, JPG, WebP, or PDF.' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setState({ phase: 'error', message: 'File too large. Maximum 10 MB.' });
      return;
    }
    setState({ phase: 'selected', file });
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runOcr(file: File) {
    setState({ phase: 'processing' });

    const fd = new FormData();
    fd.append('file', file);
    // Pass the slip type to skip classification stage when known
    const knownType = Object.keys(SLIP_TYPE_LABELS).includes(slipType)
      ? slipType.toLowerCase().replace('-', '_')
      : undefined;
    if (knownType) fd.append('slipType', knownType);

    try {
      const res = await fetch(
        '/api/ocr',
        addCsrfHeader({ method: 'POST', body: fd }),
      );

      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setState({ phase: 'error', message: error ?? 'Could not read this document.' });
        return;
      }

      const result = (await res.json()) as OcrResult;

      if (!result.extractionId) {
        // Extraction succeeded but wasn't persisted (e.g. storage error)
        // Fall back to the inline review on the slips page
        setState({ phase: 'error', message: 'Extraction succeeded but could not be saved. Please try again.' });
        return;
      }

      setState({ phase: 'done', extractionId: result.extractionId });
    } catch {
      setState({ phase: 'error', message: 'Network error. Please try again.' });
    }
  }

  function reset() {
    setState({ phase: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  const DropZone = () => (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload ${slipType} slip — click, drag, or paste`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      className="rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${isDragging ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)'}`,
        background: isDragging ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
      >
        <Upload className="w-7 h-7" style={{ color: 'var(--emerald)' }} />
      </div>
      <p className="text-white font-semibold text-[16px] mb-1">
        Drop your {slipType} here
      </p>
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
        or click to browse your files
      </p>
    </div>
  );

  // ── Page states ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 space-y-6">

      {/* Back nav */}
      <Link
        href="/slips"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'rgba(255,255,255,0.40)' }}
      >
        <ChevronLeft className="h-4 w-4" />
        Back to slips
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {slipIcon}
        </div>
        <div>
          <h1 className="text-white font-bold text-[24px] md:text-[26px]" style={{ letterSpacing: '-0.02em' }}>
            Upload {slipType}
          </h1>
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {slipLabel}
          </p>
        </div>
      </div>

      {/* ── idle ── */}
      {state.phase === 'idle' && (
        <div className="space-y-4">
          <DropZone />

          {pasteHint && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <Clipboard className="h-4 w-4 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-300 leading-relaxed">
                Screenshot your CRA My Account slip, then press{' '}
                <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.10)' }}>⌘V</kbd>{' '}
                or{' '}
                <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.10)' }}>Ctrl+V</kbd>{' '}
                to paste directly.
              </p>
            </div>
          )}

          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <Shield className="inline h-3 w-3 mr-1" />
            PDF, PNG, JPG, WebP — max 10 MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,capture=camera"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {/* ── file selected ── */}
      {state.phase === 'selected' && (
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <FileText className="h-5 w-5" style={{ color: 'var(--emerald)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{state.file.name}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {(state.file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button onClick={reset} style={{ color: 'rgba(255,255,255,0.30)' }} aria-label="Remove">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={() => runOcr(state.file)}
            className="w-full gap-2"
            style={{ background: 'var(--emerald)' }}
          >
            <Shield className="h-4 w-4" />
            Read this slip with AI
          </Button>

          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Takes about 5–10 seconds. Every box will be extracted automatically.
          </p>
        </div>
      )}

      {/* ── processing ── */}
      {state.phase === 'processing' && (
        <div
          className="rounded-2xl py-16 flex flex-col items-center gap-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--emerald)' }} />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Extracting your {slipType}…</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Identifying every box and amount
            </p>
          </div>
          <div className="flex gap-2">
            {['Classifying slip', 'Extracting fields', 'Validating values'].map((step, i) => (
              <div
                key={step}
                className="text-[10px] px-2.5 py-1 rounded-full animate-pulse"
                style={{
                  background: 'rgba(16,185,129,0.10)',
                  color: 'var(--emerald)',
                  animationDelay: `${i * 0.4}s`,
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── done (brief flash before redirect) ── */}
      {state.phase === 'done' && (
        <div
          className="rounded-2xl py-12 flex flex-col items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <CheckCircle className="h-10 w-10" style={{ color: 'var(--emerald)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--emerald)' }}>
            Extraction complete — loading review…
          </p>
        </div>
      )}

      {/* ── error ── */}
      {state.phase === 'error' && (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-300">Could not read this document</p>
                <p className="text-sm text-red-400/80 mt-0.5">{state.message}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={reset} className="border-red-400/30 text-red-300">
              Try again
            </Button>
          </div>

          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Tip: paste a screenshot with{' '}
            <kbd className="rounded px-1 py-0.5 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.10)' }}>⌘V</kbd>
          </p>
        </div>
      )}
    </div>
  );
}
