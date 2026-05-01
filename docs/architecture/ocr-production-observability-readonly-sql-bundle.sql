-- ============================================================================
-- READ-ONLY OCR OBSERVABILITY SCRIPT. DO NOT PLACE IN supabase/migrations.
-- DO NOT MODIFY DATA.
--
-- Purpose:
--   Measure OCR quality, review behavior, lineage, and duplicate signals from
--   the live Supabase data model without changing schema or data.
--
-- Tables observed:
--   public.slip_extractions   user-owned OCR attempts
--   public.slip_corrections   user corrections by extracted field
--   public.tax_slips          reviewed profile-owned tax inputs
--   public.tax_returns        provenance-rich calculation outputs
--
-- Every executable statement below is read-only.
-- ============================================================================


-- ============================================================================
-- A. OCR EXTRACTION HEALTH BY SLIP TYPE
-- ============================================================================

SELECT
  slip_type_detected,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE status = 'success') AS success_rows,
  COUNT(*) FILTER (WHERE status = 'needs_review') AS needs_review_rows,
  COUNT(*) FILTER (WHERE status IN ('classification_failed', 'extraction_failed', 'validation_failed')) AS failed_rows,
  COUNT(*) FILTER (
    WHERE CASE
      WHEN boxes IS NULL THEN true
      WHEN jsonb_typeof(boxes::jsonb) <> 'object' THEN true
      ELSE boxes::jsonb = '{}'::jsonb
    END
  ) AS blank_boxes_rows,
  ROUND(AVG(classification_confidence)::numeric, 3) AS avg_classification_confidence,
  COUNT(*) FILTER (WHERE reviewed_by_user_at IS NOT NULL) AS reviewed_rows,
  COUNT(*) FILTER (WHERE file_hash IS NULL) AS missing_file_hash_rows,
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM public.slip_extractions
GROUP BY slip_type_detected
ORDER BY total_rows DESC, slip_type_detected;


-- ============================================================================
-- B. RECENT BLANK OR FAILED EXTRACTIONS
-- Pass condition: no unexpected rows after latest upload smoke tests.
-- ============================================================================

SELECT
  id,
  user_id,
  slip_type_detected,
  status,
  classification_confidence,
  document_storage_path,
  file_hash,
  jsonb_typeof(boxes::jsonb) AS boxes_json_type,
  CASE
    WHEN boxes IS NULL THEN 0
    WHEN jsonb_typeof(boxes::jsonb) = 'object' THEN (
      SELECT COUNT(*)
      FROM jsonb_object_keys(boxes::jsonb)
    )
    ELSE NULL
  END AS box_count,
  validation_errors,
  created_at,
  reviewed_by_user_at
FROM public.slip_extractions
WHERE status <> 'success'
   OR CASE
     WHEN boxes IS NULL THEN true
     WHEN jsonb_typeof(boxes::jsonb) <> 'object' THEN true
     ELSE boxes::jsonb = '{}'::jsonb
   END
ORDER BY created_at DESC
LIMIT 50;


-- ============================================================================
-- C. FIELD PRESENCE BY SLIP TYPE AND BOX
-- Review fields with high blank_or_zero_values.
-- ============================================================================

WITH extracted_fields AS (
  SELECT
    e.slip_type_detected,
    field.key AS field_name,
    field.value AS field_value
  FROM public.slip_extractions e
  CROSS JOIN LATERAL jsonb_each_text(e.boxes::jsonb) AS field(key, value)
  WHERE e.boxes IS NOT NULL
    AND jsonb_typeof(e.boxes::jsonb) = 'object'
)
SELECT
  slip_type_detected,
  field_name,
  COUNT(*) AS observed_rows,
  COUNT(*) FILTER (
    WHERE field_value IS NULL
       OR btrim(field_value) = ''
       OR btrim(field_value) IN ('0', '0.00')
  ) AS blank_or_zero_values
FROM extracted_fields
GROUP BY slip_type_detected, field_name
ORDER BY slip_type_detected, field_name;


-- ============================================================================
-- D. REVIEW LINKAGE COMPLETENESS
-- Reviewed OCR rows should normally link to tax_slips.source_extraction_id.
-- ============================================================================

SELECT
  e.slip_type_detected,
  COUNT(*) FILTER (WHERE e.reviewed_by_user_at IS NOT NULL) AS reviewed_extractions,
  COUNT(t.id) FILTER (WHERE e.reviewed_by_user_at IS NOT NULL) AS reviewed_linked_to_tax_slips,
  COUNT(*) FILTER (
    WHERE e.reviewed_by_user_at IS NOT NULL
      AND t.id IS NULL
  ) AS reviewed_missing_tax_slip_link,
  COUNT(*) FILTER (
    WHERE e.reviewed_by_user_at IS NULL
      AND t.id IS NOT NULL
  ) AS unreviewed_but_linked_rows
FROM public.slip_extractions e
LEFT JOIN public.tax_slips t ON t.source_extraction_id = e.id
GROUP BY e.slip_type_detected
ORDER BY e.slip_type_detected;


-- ============================================================================
-- E. TAX_SLIPS OCR LINEAGE COVERAGE
-- OCR-sourced tax_slips should have file_hash and source_extraction_id.
-- ============================================================================

SELECT
  slip_type,
  source,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE profile_id IS NULL) AS missing_profile_id_rows,
  COUNT(*) FILTER (WHERE user_id IS NULL) AS missing_user_id_rows,
  COUNT(*) FILTER (WHERE tax_year IS NULL) AS missing_tax_year_rows,
  COUNT(*) FILTER (WHERE source = 'ocr' AND file_hash IS NULL) AS ocr_missing_file_hash_rows,
  COUNT(*) FILTER (WHERE source = 'ocr' AND source_extraction_id IS NULL) AS ocr_missing_source_extraction_rows,
  COUNT(*) FILTER (WHERE source_extraction_id IS NOT NULL) AS linked_extraction_rows
FROM public.tax_slips
GROUP BY slip_type, source
ORDER BY slip_type, source;


-- ============================================================================
-- F. FIELD CORRECTION RATE
-- NULL original_value means the OCR pipeline missed the field entirely.
-- ============================================================================

SELECT
  e.slip_type_detected,
  c.field_name,
  COUNT(*) AS correction_rows,
  COUNT(*) FILTER (WHERE c.original_value IS NULL OR btrim(c.original_value) = '') AS originally_missing_rows,
  COUNT(DISTINCT c.extraction_id) AS corrected_extractions,
  MIN(c.created_at) AS first_correction_at,
  MAX(c.created_at) AS last_correction_at
FROM public.slip_corrections c
JOIN public.slip_extractions e ON e.id = c.extraction_id
GROUP BY e.slip_type_detected, c.field_name
ORDER BY correction_rows DESC, e.slip_type_detected, c.field_name;


-- ============================================================================
-- G. DANGLING OCR RELATIONSHIPS
-- Pass condition: all counts are 0.
-- ============================================================================

SELECT 'tax_slips_to_slip_extractions' AS check_name, COUNT(*) AS dangling_rows
FROM public.tax_slips t
WHERE t.source_extraction_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.slip_extractions e
    WHERE e.id = t.source_extraction_id
  )
UNION ALL
SELECT 'slip_corrections_to_slip_extractions', COUNT(*)
FROM public.slip_corrections c
WHERE c.extraction_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.slip_extractions e
    WHERE e.id = c.extraction_id
  )
ORDER BY check_name;


-- ============================================================================
-- H. DUPLICATE SOURCE SIGNALS
-- These are warning queries, not delete lists.
-- ============================================================================

SELECT
  'duplicate_file_hash' AS duplicate_check,
  profile_id,
  tax_year,
  slip_type,
  file_hash,
  COUNT(*) AS duplicate_rows,
  ARRAY_AGG(id ORDER BY created_at) AS tax_slip_ids
FROM public.tax_slips
WHERE file_hash IS NOT NULL
GROUP BY profile_id, tax_year, slip_type, file_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_rows DESC, slip_type
LIMIT 50;

SELECT
  'duplicate_source_extraction_id' AS duplicate_check,
  profile_id,
  source_extraction_id,
  COUNT(*) AS duplicate_rows,
  ARRAY_AGG(id ORDER BY created_at) AS tax_slip_ids
FROM public.tax_slips
WHERE source_extraction_id IS NOT NULL
GROUP BY profile_id, source_extraction_id
HAVING COUNT(*) > 1
ORDER BY duplicate_rows DESC
LIMIT 50;


-- ============================================================================
-- I. LOGICAL DUPLICATE CANDIDATES FOR PRIORITY SLIPS
-- Uses high-signal boxes only for T4, T4A, and T2202.
-- ============================================================================

WITH logical_keys AS (
  SELECT
    id,
    profile_id,
    tax_year,
    slip_type,
    COALESCE(NULLIF(btrim(lower(issuer_name)), ''), '[missing issuer]') AS issuer_key,
    CASE
      WHEN slip_type = 'T4' THEN concat_ws('|', boxes::jsonb->>'box14', boxes::jsonb->>'box22')
      WHEN slip_type = 'T4A' THEN concat_ws('|', boxes::jsonb->>'box016', boxes::jsonb->>'box022', boxes::jsonb->>'box048', boxes::jsonb->>'box105')
      WHEN slip_type = 'T2202' THEN concat_ws('|', boxes::jsonb->>'boxA', boxes::jsonb->>'boxB', boxes::jsonb->>'boxC')
      ELSE NULL
    END AS amount_key,
    source,
    created_at
  FROM public.tax_slips
  WHERE slip_type IN ('T4', 'T4A', 'T2202')
)
SELECT
  slip_type,
  profile_id,
  tax_year,
  issuer_key,
  amount_key,
  COUNT(*) AS candidate_rows,
  ARRAY_AGG(id ORDER BY created_at) AS tax_slip_ids,
  ARRAY_AGG(source ORDER BY created_at) AS sources
FROM logical_keys
WHERE amount_key IS NOT NULL
  AND btrim(amount_key) <> ''
GROUP BY slip_type, profile_id, tax_year, issuer_key, amount_key
HAVING COUNT(*) > 1
ORDER BY candidate_rows DESC, slip_type
LIMIT 50;


-- ============================================================================
-- J. TAX RETURN PROVENANCE SLIP COVERAGE
-- Slips-mode returns should include slip-backed provenance when slips exist.
-- ============================================================================

WITH return_provenance AS (
  SELECT
    r.id,
    r.user_id,
    r.profile_id,
    r.tax_year,
    r.engine_mode,
    r.engine_version,
    r.updated_at,
    COUNT(pr.record) AS provenance_record_count,
    COUNT(pr.record) FILTER (WHERE pr.record->'source'->>'type' = 'slip') AS slip_source_record_count,
    COUNT(pr.record) FILTER (WHERE pr.record->'source'->>'type' = 'user_input') AS user_input_source_record_count,
    COUNT(pr.record) FILTER (WHERE pr.record->'source'->>'type' = 'computed') AS computed_source_record_count
  FROM public.tax_returns r
  LEFT JOIN LATERAL jsonb_array_elements(r.provenance_records) AS pr(record) ON true
  GROUP BY r.id, r.user_id, r.profile_id, r.tax_year, r.engine_mode, r.engine_version, r.updated_at
)
SELECT
  rp.*,
  COUNT(ts.id) FILTER (WHERE ts.source = 'ocr') AS ocr_tax_slips_for_profile_year,
  COUNT(ts.id) AS total_tax_slips_for_profile_year
FROM return_provenance rp
LEFT JOIN public.tax_slips ts
  ON ts.profile_id = rp.profile_id
 AND ts.tax_year = rp.tax_year
GROUP BY
  rp.id,
  rp.user_id,
  rp.profile_id,
  rp.tax_year,
  rp.engine_mode,
  rp.engine_version,
  rp.updated_at,
  rp.provenance_record_count,
  rp.slip_source_record_count,
  rp.user_input_source_record_count,
  rp.computed_source_record_count
ORDER BY rp.updated_at DESC
LIMIT 50;


-- ============================================================================
-- K. RECENT OCR END-TO-END REVIEW SAMPLE
-- Use after smoke tests to confirm extraction -> correction -> tax_slip linkage.
-- ============================================================================

SELECT
  e.id AS extraction_id,
  e.user_id,
  e.slip_type_detected,
  e.status,
  e.classification_confidence,
  CASE
    WHEN e.boxes IS NULL THEN 0
    WHEN jsonb_typeof(e.boxes::jsonb) = 'object' THEN (
      SELECT COUNT(*)
      FROM jsonb_object_keys(e.boxes::jsonb)
    )
    ELSE NULL
  END AS extracted_box_count,
  e.file_hash,
  e.created_at AS extracted_at,
  e.reviewed_by_user_at,
  COUNT(c.id) AS correction_rows,
  t.id AS tax_slip_id,
  t.profile_id,
  t.tax_year,
  t.slip_type AS saved_slip_type,
  t.source AS saved_source,
  t.file_hash AS saved_file_hash,
  t.source_extraction_id
FROM public.slip_extractions e
LEFT JOIN public.slip_corrections c ON c.extraction_id = e.id
LEFT JOIN public.tax_slips t ON t.source_extraction_id = e.id
GROUP BY
  e.id,
  e.user_id,
  e.slip_type_detected,
  e.status,
  e.classification_confidence,
  e.boxes,
  e.file_hash,
  e.created_at,
  e.reviewed_by_user_at,
  t.id,
  t.profile_id,
  t.tax_year,
  t.slip_type,
  t.source,
  t.file_hash,
  t.source_extraction_id
ORDER BY e.created_at DESC
LIMIT 50;
