/** Round to 2 decimal places (CRA standard) */
export function roundCRA(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Format as Canadian dollars */
export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format as percentage */
export function formatPercent(rate: number, decimals = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}
