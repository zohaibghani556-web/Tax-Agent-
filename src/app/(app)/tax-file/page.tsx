'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSearch,
  FileText,
  Info,
  Loader2,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TaxFileGraph, TaxFileSlipNode, TaxFileWarning } from '@/lib/tax-file/types';
import type { ProvenanceRecord } from '@/lib/tax-engine/types/provenance';
import { exportTaxFileJSON, exportTaxFileCSV, downloadFile } from '@/lib/tax-file/export';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCAD(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(n);
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft:        { bg: 'bg-white/10', text: 'text-white/60', label: 'Draft' },
  needs_review: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Needs Review' },
  reviewed:     { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Reviewed' },
  export_ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Export Ready' },
};

// ─── Status Banner ───────────────────────────────────────────────────────────

function StatusBanner({ graph }: { graph: TaxFileGraph }) {
  const style = STATUS_STYLES[graph.status] ?? STATUS_STYLES.draft;
  const s = graph.summary;

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileSearch className="w-5 h-5 text-white/60" />
          <h1 className="text-lg font-bold text-white">Tax File — {graph.taxYear}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
          {graph.status === 'export_ready' && <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5" />}
          {style.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Documents" value={s.documentCount} />
        <MiniStat label="Slips" value={s.slipCount} />
        <MiniStat label="Corrections" value={s.correctionCount} />
        <MiniStat
          label="Warnings"
          value={s.warningCount}
          tone={s.warningCount > 0 ? 'amber' : 'emerald'}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'white',
}: {
  label: string;
  value: number;
  tone?: 'white' | 'amber' | 'emerald';
}) {
  const toneClass = tone === 'amber' ? 'text-amber-400' : tone === 'emerald' ? 'text-emerald-400' : 'text-white';
  return (
    <div className="text-center">
      <p className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

// ─── Evidence List (Slips) ──────────────────────────────────────────────────

function EvidenceList({ graph }: { graph: TaxFileGraph }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (graph.slips.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center">
        <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">No slips uploaded yet</p>
        <Link href="/slips" className="text-emerald-400 text-sm hover:text-emerald-300 mt-1 inline-block">
          Upload slips →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Evidence</h2>
      <div className="space-y-2">
        {graph.slips.map((slip) => (
          <SlipRow
            key={slip.slipId}
            slip={slip}
            graph={graph}
            expanded={expandedId === slip.slipId}
            onToggle={() => setExpandedId(expandedId === slip.slipId ? null : slip.slipId)}
          />
        ))}
      </div>
    </div>
  );
}

function SlipRow({
  slip,
  graph,
  expanded,
  onToggle,
}: {
  slip: TaxFileSlipNode;
  graph: TaxFileGraph;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isOcr = slip.source === 'ocr';
  const linkedDoc = graph.documents.find((d) => d.extractionId === slip.sourceExtractionId);
  const isReviewed = linkedDoc?.reviewedAt !== null && linkedDoc?.reviewedAt !== undefined;
  const corrections = graph.corrections.filter((c) => c.extractionId === slip.sourceExtractionId);
  const provenanceEdges = graph.edges.filter(
    (e) => e.type === 'supports-line' && e.slipId === slip.slipId,
  );

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
        )}

        <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-white/10 text-white/80">
          {slip.slipType}
        </span>

        <span className="text-sm text-white/70 flex-1 truncate">{slip.issuerName || 'Unknown issuer'}</span>

        {isOcr && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              isReviewed
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isReviewed ? 'Reviewed' : 'Unreviewed'}
          </span>
        )}
        {!isOcr && (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-white/10 text-white/50">
            Manual
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/5 space-y-2">
          {/* Correction history */}
          {corrections.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Corrections</p>
              {corrections.map((c) => (
                <div key={c.correctionId} className="text-xs text-white/50 pl-3 border-l border-white/10 mb-1">
                  <span className="font-mono text-white/60">{c.fieldName}</span>
                  {': '}
                  <span className="text-red-400/70 line-through">{c.originalValue || 'empty'}</span>
                  {' → '}
                  <span className="text-emerald-400">{c.correctedValue}</span>
                </div>
              ))}
            </div>
          )}

          {/* Provenance links */}
          {provenanceEdges.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Supports</p>
              {provenanceEdges.map((edge) => {
                if (edge.type !== 'supports-line') return null;
                return (
                  <div key={`${edge.slipId}-${edge.lineFieldId}`} className="text-xs text-white/50 pl-3 border-l border-white/10 mb-1">
                    <span className="font-mono text-white/60">{edge.lineFieldId}</span>
                    {' = '}
                    <span className="text-emerald-400">{fmtCAD(edge.value)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Review link for OCR slips */}
          {isOcr && slip.sourceExtractionId && !isReviewed && (
            <Link
              href={`/slips/review/${slip.sourceExtractionId}`}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Review extraction →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Provenance Explorer ─────────────────────────────────────────────────────

function ProvenanceExplorer({ graph }: { graph: TaxFileGraph }) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const records = graph.taxReturn?.provenanceRecords ?? [];

  if (records.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center">
        <p className="text-white/40 text-sm">No provenance records yet. Run a calculation first.</p>
        <Link href="/calculator" className="text-emerald-400 text-sm hover:text-emerald-300 mt-1 inline-block">
          Go to Calculator →
        </Link>
      </div>
    );
  }

  const filtered = search.trim()
    ? records.filter((r) =>
        r.field_id.toLowerCase().includes(search.toLowerCase()) ||
        r.rule_applied?.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : records;

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
          Provenance ({records.length} records)
        </h2>
        <input
          type="text"
          placeholder="Search lines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/30 w-40 focus:outline-none focus:border-white/20"
        />
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {filtered.map((prov) => (
          <ProvenanceRow
            key={prov.field_id}
            record={prov}
            expanded={expandedId === prov.field_id}
            onToggle={() => setExpandedId(expandedId === prov.field_id ? null : prov.field_id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-white/30 text-xs text-center py-4">No matching records</p>
        )}
      </div>
    </div>
  );
}

function ProvenanceRow({
  record,
  expanded,
  onToggle,
}: {
  record: ProvenanceRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sourceLabel =
    record.source.type === 'slip' ? 'Slip' :
    record.source.type === 'user_input' ? 'Input' :
    record.source.type === 'carryforward' ? 'Prior Year' :
    'Computed';

  const sourceBg =
    record.source.type === 'slip' ? 'bg-blue-500/20 text-blue-400' :
    record.source.type === 'user_input' ? 'bg-purple-500/20 text-purple-400' :
    record.source.type === 'carryforward' ? 'bg-amber-500/20 text-amber-400' :
    'bg-white/10 text-white/60';

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-2.5 text-left">
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        )}
        <span className="font-mono text-xs text-white/70 w-48 truncate">{record.field_id}</span>
        <span className="text-xs font-semibold text-emerald-400 tabular-nums w-28 text-right">
          {fmtCAD(record.value)}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sourceBg}`}>
          {sourceLabel}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 space-y-1.5 pt-2">
          {record.rule_applied && (
            <div className="text-xs text-white/50">
              <span className="text-white/30">Rule: </span>
              {record.rule_applied.description}
              {record.rule_applied.ita_section && (
                <span className="text-white/30 ml-1">({record.rule_applied.ita_section})</span>
              )}
            </div>
          )}
          {record.computation && (
            <div className="text-xs font-mono text-white/40">
              <span className="text-white/30">Math: </span>
              {record.computation}
            </div>
          )}
          {record.source.type === 'slip' && (
            <div className="text-xs text-white/40">
              <span className="text-white/30">Source: </span>
              {(record.source as { slip_type: string; box: string }).slip_type}
              {' → '}
              {(record.source as { slip_type: string; box: string }).box}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Missing Items ───────────────────────────────────────────────────────────

function MissingItems({ warnings }: { warnings: TaxFileWarning[] }) {
  const actionable = warnings.filter((w) => w.action);
  if (actionable.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Action Items</h2>
      <div className="space-y-2">
        {actionable.map((w, i) => {
          const Icon = w.severity === 'error' ? XCircle : w.severity === 'warning' ? AlertTriangle : Info;
          const iconColor = w.severity === 'error' ? 'text-red-400' : w.severity === 'warning' ? 'text-amber-400' : 'text-blue-400';

          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70">{w.message}</p>
              </div>
              {w.actionHref && (
                <Link href={w.actionHref} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap">
                  {w.action} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Export Panel ────────────────────────────────────────────────────────────

function ExportPanel({ graph }: { graph: TaxFileGraph }) {
  function handleExportJSON() {
    const content = exportTaxFileJSON(graph);
    downloadFile(content, `taxfile-${graph.taxYear}.json`, 'application/json');
  }

  function handleExportCSV() {
    const content = exportTaxFileCSV(graph);
    downloadFile(content, `taxfile-${graph.taxYear}.csv`, 'text/csv');
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Export</h2>
      <div className="flex gap-3">
        <button
          onClick={handleExportJSON}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>
      <p className="text-[11px] text-white/30 mt-3">
        Export includes slips, calculation summary, provenance records, and warnings.
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TaxFilePage() {
  const [graph, setGraph] = useState<TaxFileGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Tax File — TaxAgent.ai';
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/tax-file?year=2025');

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `Failed to load (${res.status})`);
          setLoading(false);
          return;
        }

        const data: TaxFileGraph = await res.json();
        setGraph(data);
      } catch (err) {
        setError('Failed to load tax file');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8 text-center">
          <FileSearch className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 mb-2">{error}</p>
          <Link href="/onboarding" className="text-emerald-400 text-sm hover:text-emerald-300">
            Start your assessment →
          </Link>
        </div>
      </div>
    );
  }

  if (!graph) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <StatusBanner graph={graph} />
      <EvidenceList graph={graph} />
      <ProvenanceExplorer graph={graph} />
      <MissingItems warnings={graph.warnings} />
      <ExportPanel graph={graph} />
    </div>
  );
}
