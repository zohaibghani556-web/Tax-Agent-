/**
 * Regression test: SUPPORTED_SLIP_TYPES parity
 *
 * Verifies that every slip type defined in SLIP_FIELDS (the application's
 * source of truth for what the parser and engine handle) is also present
 * in SUPPORTED_SLIP_TYPES (what the DB persistence layer will actually save).
 *
 * If this test fails, a slip type is being parsed by OCR, processed by the
 * engine, but silently dropped before it reaches the database.
 */

import { describe, it, expect } from 'vitest';
import { SUPPORTED_SLIP_TYPES } from './tax-data';
import { SLIP_FIELDS } from '../slips/slip-fields';

describe('SUPPORTED_SLIP_TYPES parity with SLIP_FIELDS', () => {
  it('contains every slip type defined in SLIP_FIELDS', () => {
    const engineTypes = Object.keys(SLIP_FIELDS);
    const missing = engineTypes.filter((t) => !SUPPORTED_SLIP_TYPES.has(t));

    expect(missing, [
      'The following slip types are parsed by the OCR pipeline and supported',
      'by the engine, but will be silently dropped on save because they are',
      'missing from SUPPORTED_SLIP_TYPES:',
      ...missing.map((t) => `  • ${t}`),
      '',
      'Add them to SUPPORTED_SLIP_TYPES in tax-data.ts AND update the DB',
      'CHECK constraint via a new migration in supabase/migrations/.',
    ].join('\n')).toEqual([]);
  });

  it('does not contain slip types that SLIP_FIELDS does not know about', () => {
    // Forward-parity: no phantom types in the allowlist that aren't real slips.
    const engineTypes = new Set(Object.keys(SLIP_FIELDS));
    const phantoms = [...SUPPORTED_SLIP_TYPES].filter((t) => !engineTypes.has(t));

    expect(phantoms, [
      'The following types are in SUPPORTED_SLIP_TYPES but have no fields',
      'defined in SLIP_FIELDS — they cannot be rendered or edited in the UI:',
      ...phantoms.map((t) => `  • ${t}`),
    ].join('\n')).toEqual([]);
  });
});
