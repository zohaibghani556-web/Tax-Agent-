/**
 * TaxAgent.ai — Structured JSON logger with PII scrubbing.
 *
 * PROHIBITED fields (NEVER include in meta — they contain PII or secrets):
 *   email, name, legalName, sin, SIN, taxAmount, balanceOwing, slipData,
 *   password, token, key, secret, authorization
 *
 * In production: outputs JSON to stdout for log aggregation tools.
 * In development: outputs coloured console messages for readability.
 *
 * If meta accidentally contains a prohibited key, that key is omitted
 * and _scrubbed: true is added to the output.
 */

type LogLevel = 'info' | 'warn' | 'error';

// Fields that must never appear in log output — PIPEDA / security requirement
const PROHIBITED_KEYS = new Set([
  'email', 'name', 'legalName', 'sin', 'SIN',
  'taxAmount', 'balanceOwing', 'slipData',
  'password', 'token', 'key', 'secret', 'authorization',
]);

function scrubMeta(meta: Record<string, unknown>): { clean: Record<string, unknown>; scrubbed: boolean } {
  const clean: Record<string, unknown> = {};
  let scrubbed = false;
  for (const [k, v] of Object.entries(meta)) {
    if (PROHIBITED_KEYS.has(k)) {
      scrubbed = true;
    } else {
      clean[k] = v;
    }
  }
  return { clean, scrubbed };
}

const LEVEL_COLOURS: Record<LogLevel, string> = {
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
};
const RESET = '\x1b[0m';

export function log(
  level: LogLevel,
  event: string,
  meta?: Record<string, unknown>,
): void {
  const ts = new Date().toISOString();

  let cleanMeta: Record<string, unknown> = {};
  let wasScrubbed = false;

  if (meta) {
    const { clean, scrubbed } = scrubMeta(meta);
    cleanMeta = clean;
    wasScrubbed = scrubbed;
  }

  const payload: Record<string, unknown> = {
    level,
    event,
    ts,
    ...cleanMeta,
  };
  if (wasScrubbed) payload._scrubbed = true;

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(payload));
  } else {
    const colour = LEVEL_COLOURS[level];
    const prefix = `${colour}[${level.toUpperCase()}]${RESET}`;
    const metaStr = Object.keys(cleanMeta).length > 0
      ? ' ' + JSON.stringify(cleanMeta)
      : '';
    const scrubNote = wasScrubbed ? ' \x1b[35m[PII_SCRUBBED]\x1b[0m' : '';
    console.log(`${prefix} ${ts} ${event}${metaStr}${scrubNote}`);
  }
}
