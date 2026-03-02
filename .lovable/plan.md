

# Database Migration: `job_cost_summary` View

## Single Migration File

**Create:** `supabase/migrations/20260302_create_job_cost_summary_view.sql`

### Contents

1. **`CREATE OR REPLACE VIEW public.job_cost_summary`** — aggregates financial data per project/contract by joining `projects`, `contracts`, and `sov_lines`. Computes totals for committed, billed, paid, invoiced, open commitments, gross profit, margin %, avg percent complete, and SOV line count.

2. **`GRANT SELECT ON public.job_cost_summary TO authenticated`** — matches existing RLS access pattern on projects.

### Technical Notes
- View only, no table modifications
- Uses LEFT JOINs so projects without contracts or SOV lines still appear with zero totals
- Margin and profit calculations use `invoiced_to_date - paid_to_date` (revenue minus expenses)
- No RLS on views directly — access control relies on the `authenticated` role grant and any downstream query filtering

