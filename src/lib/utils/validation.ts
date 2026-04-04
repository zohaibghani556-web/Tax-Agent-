/** Validate Canadian SIN using Luhn algorithm */
export function isValidSIN(sin: string): boolean {
  const cleaned = sin.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Mask SIN for display: 123-456-789 → ***-***-789 */
export function maskSIN(sin: string): string {
  const cleaned = sin.replace(/\D/g, '');
  if (cleaned.length !== 9) return '***-***-***';
  return `***-***-${cleaned.slice(6)}`;
}

/** Validate amount is non-negative and reasonable */
export function isValidAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    amount >= 0 &&
    amount < 100_000_000
  );
}
