# Provenance Layer

Every computed field on a T1 return emits a **ProvenanceRecord** showing exactly where the number came from, which ITA/CRA rule was applied, and the explicit math. This is TaxAgent's core differentiator: every dollar on the return is clickable to see why it has that value.

## Architecture

```
ProvenanceCollector (created per engine run)
  -> ProvenanceRecordBuilder (fluent builder, one per field)
    -> ProvenanceRecord (finalized, stored in array)
```

### Flow

1. The engine orchestrator (`engine.ts` or `taxEngine.ts`) creates a `ProvenanceCollector`.
2. After each computation step, it calls `prov.record(fieldId, value)` to start a builder.
3. The builder chains `.source()`, `.rule()`, `.computation()`, then `.emit()` to finalize.
4. The collector accumulates all records.
5. At the end, `prov.toArray()` is attached to the result as `provenance`.

### Why a collector, not return-value changes?

Changing every helper function's return type from `number` to `{ value, provenance }` would have been a massive refactor touching 30+ functions and breaking every existing test. The collector pattern is non-invasive: helpers keep returning numbers, and the orchestrator emits provenance at each step.

## Types

### ProvenanceRecord

```typescript
interface ProvenanceRecord {
  field_id: string;        // "line_10100", "federal_gross_tax", "balance_owing"
  value: number;           // The computed value
  source: ProvenanceSource;
  rule_applied?: ProvenanceRule;
  computation?: string;    // "50000 + 12000 = 62000"
  timestamp: string;       // ISO 8601
  engine_version: string;  // e.g., "1.0.0"
}
```

### ProvenanceSource

Four source types:

| Type | When | Example |
|------|------|---------|
| `slip` | Value from a tax slip box | `{ type: 'slip', slip_type: 'T4', slip_index: 0, box: 'box14' }` |
| `user_input` | User-entered value | `{ type: 'user_input', input_id: 'rrspContribution' }` |
| `carryforward` | From a prior tax year | `{ type: 'carryforward', prior_year: 2024, field_id: 'tuition_unused' }` |
| `computed` | Derived from other fields | `{ type: 'computed', inputs: ['line_10100', 'line_12100'] }` |

### ProvenanceRule

```typescript
interface ProvenanceRule {
  ita_section?: string;  // "ITA s.118(1)(c)"
  folio_ref?: string;    // "Schedule 1 line 30000"
  description: string;   // "Basic Personal Amount"
}
```

## Examples

### Slip-sourced: Employment Income (line 10100)

```typescript
prov.record('line_10100', 72000)
  .source({ type: 'computed', inputs: ['t4_0_box14'] })
  .rule('Employment income from T4 slips', 'ITA s.5(1)', 'T1 line 10100')
  .computation('T4[0]: 72000+0+0 = 72000')
  .emit();
```

### User input: RRSP Deduction (line 20800)

```typescript
prov.record('line_20800', 6000)
  .input('rrspContribution')
  .rule('RRSP deduction', 'ITA s.60(i)', 'T1 line 20800')
  .computation('min(6000, 15000, 32490) = 6000')
  .emit();
```

### Computed: Federal Gross Tax

```typescript
prov.record('federal_gross_tax', 10611.07)
  .computed('line_26000')
  .rule('Federal tax using progressive brackets', 'ITA s.117', 'Schedule 1')
  .computation('progressive brackets on 68554 = 10611.07')
  .emit();
```

### Carryforward: Tuition Credit

```typescript
prov.record('tuition_carryforward', 3200)
  .carryforward(2024, 'tuition_unused')
  .rule('Unused tuition carried forward', 'ITA s.118.61')
  .emit();
```

## Field ID Convention

| Pattern | Meaning | Example |
|---------|---------|---------|
| `line_XXXXX` | CRA T1 line number | `line_10100`, `line_15000` |
| `federal_*` | Federal tax computation | `federal_gross_tax`, `federal_nrc` |
| `ontario_*` | Ontario tax computation | `ontario_surtax`, `ontario_health_premium` |
| `total_*` | Combined totals | `total_tax_payable` |
| `balance_owing` | Final refund/owing | `balance_owing` |

## Database Storage

Provenance records are stored as a JSONB column on the `tax_returns` table:

```sql
ALTER TABLE tax_returns
  ADD COLUMN provenance_records JSONB DEFAULT '[]'::jsonb;
```

This stores provenance with the return, not recomputed on every request. The column has a GIN index for querying specific field_ids.

## Testing

- 60 tests in `src/lib/tax-engine/types/provenance.test.ts`
- Unit tests for `ProvenanceCollector` and builder API
- Integration tests for both `engine.ts` and `taxEngine.ts`:
  - Every major T1 line has a provenance record
  - Provenance values match engine output values
  - Records have correct structure (field_id, value, source, timestamp, engine_version)
  - Source types correctly identify inputs (slip vs user_input vs computed)
  - Computation strings contain the actual numbers
