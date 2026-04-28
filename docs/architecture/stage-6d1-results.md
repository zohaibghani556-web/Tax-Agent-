# Stage 6D1 Results

Stage 6D1 was the read-only monitoring gate before any Stage 6D2 `NOT NULL` constraint work. It did not change schema, RLS, application code, tax logic, or production data.

## Result

Stage 6D1 ownership monitoring passed.

The live Supabase Section I go/no-go summary returned:

| Check | Result |
| --- | --- |
| `A_null_ownership` | `PASS` |
| `B_user_id_mismatch` | `PASS` |
| `C_tax_year_mismatch` | `PASS` |
| `D_orphaned_profile_id` | `PASS` |
| `E_unvalidated_foreign_keys` | `PASS` |
| `F_dangling_foreign_keys` | `PASS` |

This means live rows in the monitored profile-owned tables have no null ownership values, denormalized `user_id` and `tax_year` match `tax_profiles`, no `profile_id` orphan rows were detected, and monitored foreign keys are valid.

## Smoke Test Coverage

The manual app smoke test covered the Stage 6D1 ownership write paths:

- Onboarding chat message writes.
- Slip upload/OCR path through review/confirm where available.
- Manual slip entry path.
- Calculator run path.
- Filing guide generation path.

The account deletion path was intentionally not smoke-tested because it is destructive and cannot create null ownership rows.

## Observed During Smoke Test

These findings are important product work, but they are not Stage 6D ownership blockers:

| Finding | Stage 6D impact | Follow-up |
| --- | --- | --- |
| OCR completed but extracted little or blank data. | Does not invalidate ownership monitoring if `tax_slips` rows still have `profile_id`, `user_id`, and `tax_year`. | Track in product quality backlog. |
| A T4 duplicate appeared or was preserved from a prior test session. | Does not block `NOT NULL` constraints unless duplicates have bad ownership fields. | Audit duplicate handling beyond the T2202-specific fix. |
| Website and upload/filing-guide flows feel slow; Vercel Speed Insights score was 56. | Does not affect ownership constraints. | Run performance audit before beta. |
| Assessment UI feels like a generic chatbot. | Does not affect ownership constraints. | Redesign as guided intake/workbench flow. |
| Calculation output appears materially wrong. | Does not affect ownership constraints directly, but it is a product correctness blocker. | Prioritize deterministic tax-engine audit before more product expansion. |

## SQL Bundle Correction

During the manual run, the read-only bundle failed on `deductions_credits.updated_at` because the live table uses `created_at`. The bundle has been corrected so recent-write monitoring reads:

```sql
SELECT 'deductions_credits' AS table_name, id, user_id, profile_id, tax_year, created_at
FROM public.deductions_credits
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
```

The corrected bundle remains read-only.

## Stage 6D1 Decision

Stage 6D1 is complete. It is reasonable to draft Stage 6D2 as a `NOT NULL`-only hardening stage, but RLS consolidation should remain delayed.

Do not let the Stage 6D1 pass result hide product risks. Tax correctness, OCR quality, duplicate handling, performance, and intake UX need separate work before beta.
