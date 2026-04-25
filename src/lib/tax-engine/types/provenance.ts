/**
 * TaxAgent.ai — Provenance Layer
 *
 * Every computed field on a T1 return emits a ProvenanceRecord showing exactly
 * where the number came from, which ITA/CRA rule was applied, and the explicit
 * math. This is TaxAgent's core differentiator: every dollar is clickable.
 *
 * Architecture:
 *   - ProvenanceRecord: one record per output field (keyed by CRA line or
 *     internal field_id like "schedule_1_line_30000")
 *   - ProvenanceCollector: accumulates records during a single engine run;
 *     passed through the orchestrator so sub-functions can emit records
 *     without changing their return types.
 */

// ============================================================
// ENGINE VERSION — bumped when tax logic changes
// ============================================================

/** Semantic version of the tax engine. Update on every rule change. */
export const ENGINE_VERSION = '1.0.0';

// ============================================================
// PROVENANCE RECORD
// ============================================================

/**
 * Describes where a computed value came from.
 *
 * - slip: value originated from a specific box on a tax slip
 * - user_input: value was entered by the user (not from a slip)
 * - carryforward: value carried from a prior tax year
 * - computed: value was derived from other provenance-tracked fields
 */
export type ProvenanceSource =
  | { type: 'slip'; slip_type: string; slip_index: number; box: string }
  | { type: 'user_input'; input_id: string }
  | { type: 'carryforward'; prior_year: number; field_id: string }
  | { type: 'computed'; inputs: string[] };

/**
 * Optional reference to the rule that produced this value.
 * At least `description` is always present; ITA section and CRA folio
 * are included when a specific statutory authority applies.
 */
export interface ProvenanceRule {
  /** ITA section (e.g., "s.118(1)(c)") or Ontario Taxation Act section */
  ita_section?: string;
  /** CRA folio, IT bulletin, or form reference (e.g., "Schedule 1 line 30000") */
  folio_ref?: string;
  /** Plain-English description of the rule applied */
  description: string;
}

/**
 * A single provenance record. One per computed field on the return.
 *
 * field_id uses the pattern:
 *   - "line_XXXXX" for CRA T1 lines (e.g., "line_10100")
 *   - "schedule_N_line_XXXXX" for schedule lines
 *   - "on428_line_XXXXX" for Ontario ON428 lines
 *   - descriptive ids for internal fields (e.g., "federal_gross_tax")
 */
export interface ProvenanceRecord {
  /** Unique field identifier (e.g., "line_10100", "federal_bpa_credit") */
  field_id: string;
  /** The computed value */
  value: number;
  /** Where the value came from */
  source: ProvenanceSource;
  /** The tax rule that produced this value */
  rule_applied?: ProvenanceRule;
  /** The explicit math (e.g., "2320 + 2030 = 4350") */
  computation?: string;
  /** ISO 8601 timestamp of when the record was emitted */
  timestamp: string;
  /** Engine version that produced this record */
  engine_version: string;
}

// ============================================================
// PROVENANCE COLLECTOR — builder pattern
// ============================================================

/**
 * Accumulates ProvenanceRecords during a single tax engine run.
 *
 * Usage:
 *   const collector = new ProvenanceCollector();
 *   collector.record('line_10100', employmentIncome)
 *     .source({ type: 'slip', slip_type: 'T4', slip_index: 0, box: 'box14' })
 *     .rule('ITA s.5(1)', 'Employment income', 'Schedule 1 line 10100')
 *     .computation('50000 + 12000 = 62000')
 *     .emit();
 *
 * At the end, call collector.records() to get all emitted records.
 */
export class ProvenanceCollector {
  private _records: ProvenanceRecord[] = [];
  private _timestamp: string;

  constructor() {
    this._timestamp = new Date().toISOString();
  }

  /**
   * Start building a provenance record for a field.
   * Returns a fluent builder — call .emit() to finalize.
   */
  record(fieldId: string, value: number): ProvenanceRecordBuilder {
    return new ProvenanceRecordBuilder(this, fieldId, value, this._timestamp);
  }

  /** @internal — called by the builder to add a finalized record. */
  _add(record: ProvenanceRecord): void {
    this._records.push(record);
  }

  /** Returns all emitted records, keyed by field_id for O(1) lookup. */
  toMap(): Map<string, ProvenanceRecord> {
    const map = new Map<string, ProvenanceRecord>();
    for (const r of this._records) {
      map.set(r.field_id, r);
    }
    return map;
  }

  /** Returns all emitted records as an array (for JSON serialization). */
  toArray(): ProvenanceRecord[] {
    return [...this._records];
  }

  /** Number of records collected. */
  get size(): number {
    return this._records.length;
  }
}

// ============================================================
// FLUENT BUILDER
// ============================================================

/**
 * Fluent builder for a single ProvenanceRecord.
 * Chain .source(), .rule(), .computation(), then call .emit() to finalize.
 */
export class ProvenanceRecordBuilder {
  private _collector: ProvenanceCollector;
  private _fieldId: string;
  private _value: number;
  private _timestamp: string;
  private _source: ProvenanceSource = { type: 'computed', inputs: [] };
  private _rule?: ProvenanceRule;
  private _computation?: string;

  constructor(
    collector: ProvenanceCollector,
    fieldId: string,
    value: number,
    timestamp: string,
  ) {
    this._collector = collector;
    this._fieldId = fieldId;
    this._value = value;
    this._timestamp = timestamp;
  }

  /** Set the source of this value. */
  source(src: ProvenanceSource): this {
    this._source = src;
    return this;
  }

  /** Shorthand: mark as computed from other provenance-tracked fields. */
  computed(...inputFieldIds: string[]): this {
    this._source = { type: 'computed', inputs: inputFieldIds };
    return this;
  }

  /** Shorthand: mark as sourced from a slip box. */
  slip(slipType: string, slipIndex: number, box: string): this {
    this._source = { type: 'slip', slip_type: slipType, slip_index: slipIndex, box };
    return this;
  }

  /** Shorthand: mark as user input. */
  input(inputId: string): this {
    this._source = { type: 'user_input', input_id: inputId };
    return this;
  }

  /** Shorthand: mark as carryforward from a prior year. */
  carryforward(priorYear: number, fieldId: string): this {
    this._source = { type: 'carryforward', prior_year: priorYear, field_id: fieldId };
    return this;
  }

  /** Set the rule applied. */
  rule(description: string, itaSection?: string, folioRef?: string): this {
    this._rule = { description, ita_section: itaSection, folio_ref: folioRef };
    return this;
  }

  /** Set the explicit computation string. */
  computation(math: string): this {
    this._computation = math;
    return this;
  }

  /** Finalize and add this record to the collector. Returns the collector for chaining. */
  emit(): ProvenanceCollector {
    const record: ProvenanceRecord = {
      field_id: this._fieldId,
      value: this._value,
      source: this._source,
      rule_applied: this._rule,
      computation: this._computation,
      timestamp: this._timestamp,
      engine_version: ENGINE_VERSION,
    };
    this._collector._add(record);
    return this._collector;
  }
}
