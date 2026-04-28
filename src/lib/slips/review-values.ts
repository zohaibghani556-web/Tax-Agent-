import { SLIP_FIELDS } from './slip-fields';

export type ReviewFieldValue = number | string;
export type ReviewFieldValues = Record<string, ReviewFieldValue>;

export interface ReviewFieldIssue {
  field: string;
  message: string;
}

export function getIssuerFieldKey(slipType: string): 'issuerName' | 'institutionName' {
  return slipType === 'T2202' ? 'institutionName' : 'issuerName';
}

export function isBlankReviewValue(value: unknown): boolean {
  return value === undefined
    || value === null
    || (typeof value === 'string' && value.trim() === '');
}

export function buildReviewFieldValues(
  slipType: string,
  boxes: ReviewFieldValues,
  issuerName?: string | null,
): ReviewFieldValues {
  const fields = SLIP_FIELDS[slipType] ?? [];
  const fieldKeys = new Set(fields.map((field) => field.key));
  const values: ReviewFieldValues = {};

  for (const [key, value] of Object.entries(boxes)) {
    if (fieldKeys.has(key)) {
      values[key] = value;
    }
  }

  const issuerKey = getIssuerFieldKey(slipType);
  if (fieldKeys.has(issuerKey) && isBlankReviewValue(values[issuerKey]) && issuerName) {
    values[issuerKey] = issuerName;
  }

  return values;
}

export function validateReviewFieldValues(
  slipType: string,
  values: ReviewFieldValues,
): ReviewFieldIssue[] {
  const fields = SLIP_FIELDS[slipType] ?? [];
  const issues: ReviewFieldIssue[] = [];

  for (const field of fields) {
    const value = values[field.key];
    if (field.required && isBlankReviewValue(value)) {
      issues.push({
        field: field.key,
        message: `${field.label} is required before this slip can be saved.`,
      });
      continue;
    }

    if (
      !isBlankReviewValue(value)
      && field.valueType === 'number'
      && (typeof value !== 'number' || !Number.isFinite(value))
    ) {
      issues.push({
        field: field.key,
        message: `${field.label} must be a valid number.`,
      });
    }
  }

  return issues;
}

export function sanitizeReviewFieldValues(
  slipType: string,
  values: ReviewFieldValues,
): ReviewFieldValues {
  const fields = SLIP_FIELDS[slipType] ?? [];
  const sanitized: ReviewFieldValues = {};

  for (const field of fields) {
    const value = values[field.key];
    if (isBlankReviewValue(value)) continue;

    if (field.valueType === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) {
        sanitized[field.key] = value;
      }
      continue;
    }

    sanitized[field.key] = typeof value === 'string' ? value.trim() : String(value);
  }

  return sanitized;
}

export function hasReviewValueChanged(
  originalValue: ReviewFieldValue | undefined,
  currentValue: ReviewFieldValue | undefined,
): boolean {
  if (isBlankReviewValue(originalValue) && isBlankReviewValue(currentValue)) {
    return false;
  }
  return String(originalValue ?? '') !== String(currentValue ?? '');
}
