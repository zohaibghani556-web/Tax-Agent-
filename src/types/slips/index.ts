/**
 * Slip type exports — two layers:
 *
 * CRA layer (/cra/) — XSD-faithful interfaces generated from CRA v1.26.3 schemas.
 *   Never hand-edit. Regenerate with: npm run gen:slip-types
 *
 * App layer — existing types in src/lib/tax-engine/types.ts (box14, box16, etc.)
 *   These drive the tax engine. Use XSD_BOX_MAP to translate between layers.
 */

// CRA XSD-faithful types (additive — do not replace app types)
export * from './cra';
