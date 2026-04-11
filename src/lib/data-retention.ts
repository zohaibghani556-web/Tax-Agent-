/**
 * TaxAgent.ai — Data Retention Policy
 *
 * CRA requires taxpayers to keep records for 6 years from the end of the
 * tax year to which they relate (ITA s.230(4)).
 * TaxAgent retains data for 7 years to provide a one-year buffer.
 *
 * TODO: Schedule this as a Supabase cron function (pg_cron extension) to run
 * annually on January 1. Enable pg_cron in Supabase dashboard → Extensions.
 *
 *   SELECT cron.schedule('purge-old-tax-data', '0 0 1 1 *',
 *     $$SELECT purge_expired_tax_records()$$);
 *
 * The purge function SQL (create as a Supabase migration):
 *
 *   CREATE OR REPLACE FUNCTION purge_expired_tax_records()
 *   RETURNS void LANGUAGE plpgsql AS $$
 *   DECLARE
 *     cutoff_year INTEGER := EXTRACT(YEAR FROM NOW()) - 8; -- 7-year retention
 *   BEGIN
 *     -- Delete in FK-safe order
 *     DELETE FROM tax_slips
 *       WHERE profile_id IN (
 *         SELECT id FROM tax_profiles WHERE tax_year <= cutoff_year
 *       );
 *     DELETE FROM tax_calculations
 *       WHERE profile_id IN (
 *         SELECT id FROM tax_profiles WHERE tax_year <= cutoff_year
 *       );
 *     DELETE FROM deductions_credits
 *       WHERE profile_id IN (
 *         SELECT id FROM tax_profiles WHERE tax_year <= cutoff_year
 *       );
 *     DELETE FROM tax_profiles WHERE tax_year <= cutoff_year;
 *   END;
 *   $$;
 */

/** CRA minimum retention: 6 years. TaxAgent applies 7 for a one-year buffer. */
export const DATA_RETENTION_YEARS = 7;

/** Policy reference for audit purposes */
export const DATA_RETENTION_POLICY = 'ITA s.230(4) — 6 years minimum, 7 years applied';

/**
 * Returns true if records for the given taxYear have passed the retention window.
 * A taxYear of 2017 with currentYear 2025 → (2025 - 2017) = 8 > 7 → expired.
 */
export function isExpired(taxYear: number, currentYear: number): boolean {
  return (currentYear - taxYear) > DATA_RETENTION_YEARS;
}

/**
 * Returns the ISO date (YYYY-01-01) after which records for taxYear can be deleted.
 * Example: taxYear=2018 → "2026-01-01" (2018 + 7 + 1)
 */
export function retentionExpiryDate(taxYear: number): string {
  return `${taxYear + DATA_RETENTION_YEARS + 1}-01-01`;
}
