# Stage 6D1 — Write Path Coverage Matrix

> Generated 2026-04-27. Covers every active production write path to the seven target tables.
> Use this to plan Stage 6D2 constraint enforcement.

---

## Table of Contents

1. [tax_slips](#1-tax_slips)
2. [tax_calculations](#2-tax_calculations)
3. [tax_returns](#3-tax_returns)
4. [chat_messages](#4-chat_messages)
5. [deductions_credits](#5-deductions_credits)
6. [business_income](#6-business_income)
7. [rental_income](#7-rental_income)
8. [Inactive / Unknown Paths](#inactive--unknown-paths)
9. [What the User Actually Has to Click](#what-the-user-actually-has-to-click)

---

## 1. tax_slips

### Write Path A — Slips page (manual entry + edit + delete)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `upsertSlips()` |
| **File** | `src/lib/supabase/tax-data.ts:224–263` |
| **Called from** | `src/app/(app)/slips/page.tsx:337` via `syncSlips()` |
| **API route** | N/A (client-side Supabase call) |
| **UI action** | Slips page → add, edit, or delete a slip → waits 800ms debounce → syncs |
| **Operation** | DELETE all existing rows for `profile_id`, then INSERT fresh batch |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ |
| **Verification query** | `SELECT id, user_id, profile_id, tax_year, slip_type FROM tax_slips WHERE profile_id = '<pid>' ORDER BY created_at;` |
| **Pass/fail** | Every row has non-null `user_id`, `profile_id`, `tax_year`. Row count matches localStorage. |
| **Notes** | Replace-all strategy: deletes then re-inserts. Safe for dedup but briefly leaves zero rows. |

### Write Path B — OCR review page (confirm extraction)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `upsertSlips()` |
| **File** | `src/lib/supabase/tax-data.ts:224–263` |
| **Called from** | `src/app/(app)/slips/review/[extraction_id]/page.tsx:336` |
| **API route** | N/A (client-side Supabase call after POST `/api/slips/corrections`) |
| **UI action** | Upload slip → OCR → Review page → Confirm → upsertSlips called |
| **Operation** | DELETE + INSERT (same as Path A) |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ · `file_hash` ✅ · `source_extraction_id` ✅ · `source` = `'ocr'` |
| **Verification query** | `SELECT id, user_id, profile_id, tax_year, slip_type, source, file_hash FROM tax_slips WHERE profile_id = '<pid>' AND source = 'ocr';` |
| **Pass/fail** | OCR-sourced rows have non-null `file_hash` and `source_extraction_id`. |
| **Notes** | Review page first calls POST `/api/slips/corrections` (writes to `slip_corrections` + marks `slip_extractions` reviewed), then calls `upsertSlips` client-side. |

### Write Path C — slip-store.ts (unified store)

| Field | Value |
|---|---|
| **Status** | INACTIVE (code exists, not wired in production) |
| **Write function** | `createSlip()`, `updateSlip()`, `deleteSlip()` |
| **File** | `src/lib/supabase/slip-store.ts:506–712` |
| **Called from** | Not called from any active page. Comment in `slips/page.tsx:26` explicitly disables it. |
| **Notes** | Queries columns (`slip_status`, etc.) from the unified migration that may not be on live DB yet. Do NOT count on this path for Stage 6D1/6D2. |

---

## 2. tax_calculations

### Write Path A — Calculator page (calculate button)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `saveCalculationResult()` |
| **File** | `src/lib/supabase/tax-data.ts:417–447` |
| **Called from** | `src/app/(app)/calculator/page.tsx:646` |
| **API route** | N/A (client-side call after receiving result from `/api/calculate`) |
| **UI action** | Calculator page → loads slips → auto-calculates OR user presses ⌘+Enter → saves result |
| **Operation** | INSERT (append-only history) |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ |
| **Verification query** | `SELECT id, user_id, profile_id, tax_year, calculated_at FROM tax_calculations WHERE profile_id = '<pid>' ORDER BY calculated_at DESC LIMIT 5;` |
| **Pass/fail** | Every row has non-null `user_id`, `profile_id`, `tax_year`. `detailed_breakdown` is non-null JSONB. |
| **Notes** | Append-only. No delete/update of old calculation rows. `saveFilingGuide()` can UPDATE `filing_steps` on the latest row. |

### Write Path B — Filing guide save

| Field | Value |
|---|---|
| **Status** | ACTIVE (secondary — updates existing row) |
| **Write function** | `saveFilingGuide()` |
| **File** | `src/lib/supabase/tax-data.ts:650–675` |
| **Called from** | Filing guide page (stores guide on latest `tax_calculations` row) |
| **API route** | N/A (client-side after receiving guide from `/api/filing-guide`) |
| **UI action** | Filing Guide page → Generate guide → saves onto latest calculation row |
| **Operation** | UPDATE (sets `filing_steps` JSONB on existing row) |
| **Fields populated** | N/A (UPDATE only — no new row created) |
| **Verification query** | `SELECT id, filing_steps IS NOT NULL AS has_guide FROM tax_calculations WHERE profile_id = '<pid>' ORDER BY calculated_at DESC LIMIT 1;` |
| **Pass/fail** | `has_guide` = true after generating a filing guide. |

---

## 3. tax_returns

### Write Path A — /api/calculate (flat mode)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `saveTaxReturn()` |
| **File** | `src/lib/supabase/tax-data.ts:511–557` |
| **Called from** | `src/app/api/calculate/route.ts:96` |
| **API route** | POST `/api/calculate` (`mode: 'flat'`) |
| **UI action** | Onboarding assessment completes → auto-calculation fires → `/api/calculate` → `saveTaxReturn()` |
| **Operation** | UPSERT on `(profile_id, tax_year, engine_mode)` |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ · `engine_mode` = `'flat'` · `engine_version` ✅ · `provenance_records` ✅ |
| **Verification query** | `SELECT id, user_id, profile_id, tax_year, engine_mode, engine_version FROM tax_returns WHERE profile_id = '<pid>';` |
| **Pass/fail** | Row exists with `engine_mode = 'flat'`, non-null `provenance_records`, non-null `engine_version`. |
| **Notes** | Uses server-side Supabase client (passed from route handler). Upsert overwrites on repeat calculation. |

### Write Path B — /api/calculate (slips mode)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `saveTaxReturn()` |
| **File** | `src/lib/supabase/tax-data.ts:511–557` |
| **Called from** | `src/app/api/calculate/route.ts:137` |
| **API route** | POST `/api/calculate` (`mode: 'slips'` or default) |
| **UI action** | Calculator page → calculate → `/api/calculate` → `saveTaxReturn()` |
| **Operation** | UPSERT on `(profile_id, tax_year, engine_mode)` |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ · `engine_mode` = `'slips'` |
| **Verification query** | Same as Path A, filter `engine_mode = 'slips'`. |
| **Pass/fail** | Row exists after calculator page runs with uploaded slips. |

---

## 4. chat_messages

### Write Path A — Onboarding page (save conversation turns)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `saveMessage()` |
| **File** | `src/lib/supabase/tax-data.ts:598–613` |
| **Called from** | `src/app/(app)/onboarding/page.tsx:527–528` |
| **API route** | N/A (client-side call) |
| **UI action** | Onboarding → type message → send → after streaming completes, saves both user + assistant turns |
| **Operation** | INSERT (two rows per exchange: one user, one assistant) |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ · `role` ✅ · `content` ✅ |
| **Verification query** | `SELECT id, user_id, profile_id, tax_year, role, LENGTH(content) AS len FROM chat_messages WHERE profile_id = '<pid>' ORDER BY created_at;` |
| **Pass/fail** | Alternating user/assistant rows. All have non-null `user_id`, `profile_id`, `tax_year`. |

### Write Path B — Onboarding restart (clear messages)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `clearMessages()` |
| **File** | `src/lib/supabase/tax-data.ts:633–644` |
| **Called from** | `src/app/(app)/onboarding/page.tsx:597` |
| **UI action** | Onboarding → "Start over" button |
| **Operation** | DELETE all rows for `profile_id` |
| **Verification query** | `SELECT COUNT(*) FROM chat_messages WHERE profile_id = '<pid>';` |
| **Pass/fail** | Count = 0 after restart. |

---

## 5. deductions_credits

### Write Path A — Onboarding page (AI-driven deductions update)

| Field | Value |
|---|---|
| **Status** | ACTIVE |
| **Write function** | `upsertDeductions()` |
| **File** | `src/lib/supabase/tax-data.ts:311–355` |
| **Called from** | `src/app/(app)/onboarding/page.tsx:154` via `applyDeductionsUpdate()` |
| **API route** | N/A (client-side call) |
| **UI action** | Onboarding → AI emits `<deductions-update>` XML tag → parsed → saved |
| **Operation** | UPSERT on `profile_id` |
| **Fields populated** | `user_id` ✅ · `profile_id` ✅ · `tax_year` ✅ |
| **Verification query** | `SELECT user_id, profile_id, tax_year, rrsp_contributions, union_dues FROM deductions_credits WHERE profile_id = '<pid>';` |
| **Pass/fail** | Row exists with non-null `user_id`, `profile_id`, `tax_year`. Values match what the AI extracted. |
| **Notes** | Only triggered when AI emits structured deductions data during the assessment. Not every assessment triggers this. |

### Write Path B — Calculator page (deductions panel save)

| Field | Value |
|---|---|
| **Status** | INACTIVE for database writes |
| **Notes** | The calculator page reads deductions from DB via `getDbDeductions()` but saves deduction edits to localStorage only. The active Supabase write for `deductions_credits` is the onboarding `upsertDeductions()` path above. |

---

## 6. business_income

| Field | Value |
|---|---|
| **Status** | TABLE EXISTS / NO ACTIVE APP WRITE PATH FOUND |
| **Schema evidence** | RLS is defined in `supabase/migrations/20260405000000_initial_schema_rls.sql`; Stage 6C added nullable `user_id` and `tax_year` plus indexes/FK in `supabase/migrations/20260429000001_stage_6c_profile_owned_user_year_alignment.sql`. |
| **Active code** | No active Supabase write helper found in `tax-data.ts`; no page/API route writes `business_income`. |
| **UI path** | None. The calculator page passes `business: []` to `/api/calculate`. |
| **Engine support** | `engine.ts` accepts `BusinessIncome[]` but the data comes from the API request body, not from a DB table. |
| **Expected fields populated** | N/A for current UI because no app write path exists. Existing/live rows, if any, must still be checked for `profile_id`, `user_id`, and `tax_year` before Stage 6D2. |
| **Verification query** | `SELECT COUNT(*) AS total_rows, COUNT(*) FILTER (WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) AS unsafe_rows FROM business_income;` |
| **Pass/fail** | Pass only if `unsafe_rows = 0`. If `total_rows > 0`, also run mismatch and orphan checks from the SQL bundle. |
| **Stage 6D2 impact** | **Conditional.** Because the table exists but has no active UI write path, either keep it out of Stage 6D2 or apply NOT NULL only after live checks confirm zero unsafe rows and the team intentionally accepts constraining an inactive/empty table. |
| **What would need to happen before relying on it** | Add a production-safe persistence helper in `tax-data.ts`, UI/API entry path, tests, and Stage 6F-style write-path verification. |

---

## 7. rental_income

| Field | Value |
|---|---|
| **Status** | TABLE EXISTS / NO ACTIVE APP WRITE PATH FOUND |
| **Schema evidence** | RLS is defined in `supabase/migrations/20260405000000_initial_schema_rls.sql`; Stage 6C added nullable `user_id` and `tax_year` plus indexes/FK in `supabase/migrations/20260429000001_stage_6c_profile_owned_user_year_alignment.sql`. |
| **Active code** | No active Supabase write helper found in `tax-data.ts`; no page/API route writes `rental_income`. |
| **UI path** | None. The calculator page passes `rental: []` to `/api/calculate`. |
| **Engine support** | `engine.ts` accepts `RentalIncome[]` but the data comes from the API request body, not from a DB table. |
| **Expected fields populated** | N/A for current UI because no app write path exists. Existing/live rows, if any, must still be checked for `profile_id`, `user_id`, and `tax_year` before Stage 6D2. |
| **Verification query** | `SELECT COUNT(*) AS total_rows, COUNT(*) FILTER (WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) AS unsafe_rows FROM rental_income;` |
| **Pass/fail** | Pass only if `unsafe_rows = 0`. If `total_rows > 0`, also run mismatch and orphan checks from the SQL bundle. |
| **Stage 6D2 impact** | **Conditional.** Because the table exists but has no active UI write path, either keep it out of Stage 6D2 or apply NOT NULL only after live checks confirm zero unsafe rows and the team intentionally accepts constraining an inactive/empty table. |
| **What would need to happen before relying on it** | Same as `business_income`: production-safe persistence helper, UI/API entry path, tests, and write-path verification. |

---

## Inactive / Unknown Paths

### slip-store.ts (unified store)

- **File**: `src/lib/supabase/slip-store.ts`
- **Functions**: `createSlip()`, `updateSlip()`, `deleteSlip()`, `listSlipsByUserAndTaxYear()`
- **Status**: Code exists but is explicitly disabled in production pages. Comments in `slips/page.tsx:26` say: "re-enable only after the unified migration is applied to the live database."
- **Risk**: If someone imports and calls these functions without checking, they will write rows with columns (`slip_status`, `source_method`, etc.) that may not exist on the live schema. Currently safe because no active page calls them.
- **Recommendation**: Do NOT include in Stage 6D2 scope. Monitor only.

### slip_extractions (ancillary write)

- **File**: `src/app/api/ocr/route.ts:186–201`
- **Status**: ACTIVE but not one of the seven target tables. Writes happen server-side during OCR upload. Each upload creates one `slip_extractions` row.
- **Fields populated**: `user_id` ✅ · `document_storage_path` ✅ · `file_hash` ✅ (no `profile_id` — this table uses `user_id` directly)

### slip_corrections (ancillary write)

- **File**: `src/app/api/slips/corrections/route.ts:114`
- **Status**: ACTIVE but not one of the seven target tables. Written when user reviews an OCR extraction and submits corrections.
- **Fields populated**: `user_id` ✅ · `extraction_id` ✅

### account deletion route (destructive cleanup path)

- **File**: `src/app/api/account/delete/route.ts:85-112`
- **Status**: ACTIVE delete-only path. It deletes `tax_slips`, `tax_calculations`, `deductions_credits`, and `tax_profiles` for the authenticated user with a service-role client.
- **Stage 6D1 handling**: Do NOT smoke test this path with a real account unless explicitly planning account deletion. It cannot create null ownership rows, but it can reduce row counts and should be considered when interpreting monitoring output.
- **RLS note**: This route intentionally bypasses RLS for account deletion operations. Do not use it as evidence for or against normal user-facing RLS behavior.

### tax_profiles (anchor table)

- **File**: `src/lib/supabase/tax-data.ts:104–145` (`getOrCreateProfileContext`)
- **Status**: ACTIVE. Created lazily on first write to any profile-owned table.
- **Called from**: Every write function in `tax-data.ts`.
- **Fields populated**: `user_id` ✅ · `tax_year` ✅

---

## What the User Actually Has to Click

This section is for non-technical verification. Follow these steps to exercise every active write path.

### Step 1: Start the AI Assessment (writes to `chat_messages`, `deductions_credits`, `tax_profiles`)

1. Log in to TaxAgent.ai
2. Click **"Start Assessment"** (or navigate to `/onboarding`)
3. Answer the AI's questions through at least 3-4 exchanges
4. **What happens in the database**: Each send creates 2 rows in `chat_messages` (user + assistant). If the AI detects deductions info, it writes to `deductions_credits`.

### Step 2: Complete the Assessment (writes to `tax_profiles`, `tax_returns`)

1. Continue answering until the AI says "assessment is complete"
2. Click **"Proceed to slips"** (or "Go to calculator")
3. **What happens in the database**: `tax_profiles.assessment_complete` is set to true. If the assistant emitted the expected completion marker and auto-calculation fires, a row is written to `tax_returns` with `engine_mode = 'flat'`.
4. **Coverage note**: If no `flat` tax return appears, do not force it by manually editing data. The calculator step below reliably covers the active `slips` tax return path.

### Step 3: Upload a Tax Slip via OCR (writes to `slip_extractions`, then `tax_slips`)

1. Navigate to `/slips`
2. Click **"Upload T4"** (or any slip type)
3. Select or photograph a slip image
4. Wait for OCR extraction to complete
5. **What happens in the database**: `slip_extractions` gets a new row. You are redirected to the review page.
6. On the review page, check the extracted values and click **"Confirm"**
7. **What happens in the database**: `slip_corrections` gets rows (if you made changes), `slip_extractions` is marked reviewed, `tax_slips` gets updated via `upsertSlips`.

### Step 4: Manually Enter a Slip (writes to `tax_slips`)

1. Navigate to `/slips`
2. Switch to the **"Manual entry"** tab
3. Select a slip type, fill in the boxes, click **"Add slip"**
4. **What happens in the database**: After 800ms debounce, `upsertSlips` fires — deletes existing rows for this profile and re-inserts the full slip set.

### Step 5: Run the Calculator (writes to `tax_calculations`, `tax_returns`)

1. Navigate to `/calculator`
2. If you have slips, the calculator auto-runs on page load
3. Otherwise, press **⌘+Enter** or wait for auto-calc
4. **What happens in the database**: `tax_calculations` gets a new append-only row. `tax_returns` gets an upsert with `engine_mode = 'slips'` from the calculator/API path.

### Step 6: Generate a Filing Guide (writes to `tax_calculations` — UPDATE only)

1. Navigate to `/filing-guide`
2. Click **"Generate filing guide"**
3. **What happens in the database**: The `filing_steps` column on the latest `tax_calculations` row is updated with the guide JSON.

### Step 7: Restart Assessment (deletes from `chat_messages`)

1. Navigate to `/onboarding`
2. Click **"Start over"**
3. **What happens in the database**: All `chat_messages` for this profile are deleted.

---

## Coverage Summary

| Table | Active Write Paths | UI-Testable? | `profile_id` populated? | `user_id` populated? | `tax_year` populated? |
|---|---|---|---|---|---|
| `tax_slips` | 2 (manual + OCR review) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `tax_calculations` | 2 (insert + guide update) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `tax_returns` | 2 (flat + slips mode) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `chat_messages` | 2 (insert + delete) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| `deductions_credits` | 1 (AI-driven upsert) | ⚠️ Conditional | ✅ Yes | ✅ Yes | ✅ Yes |
| `business_income` | 0 (table exists, no active app writer found) | ❌ No | ⚠️ Check live rows | ⚠️ Check live rows | ⚠️ Check live rows |
| `rental_income` | 0 (table exists, no active app writer found) | ❌ No | ⚠️ Check live rows | ⚠️ Check live rows | ⚠️ Check live rows |

### Stage 6D2 Readiness

- **Ready for NOT NULL**: `tax_slips`, `tax_calculations`, `tax_returns`, `chat_messages` — all active paths populate `profile_id`, `user_id`, `tax_year`.
- **Conditional**: `deductions_credits` — only written when AI emits deductions during assessment. Test by completing an assessment that mentions RRSP contributions.
- **Conditional / likely split out**: `business_income`, `rental_income` — tables exist and Stage 6C aligned their columns, but no active UI/API writer was found. They should be constrained only after live row checks pass and the team explicitly decides whether inactive/empty tables belong in Stage 6D2.
