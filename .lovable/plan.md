

# Migration: AP Aging Summary + Portfolio Summary Views

## Issue with Provided SQL

The `vendor_bills` table schema doesn't match the SQL provided:
- No `bill_number` column → actual column is `number`
- No `total_amount` → actual column is `total`
- No `project_id` on `vendor_bills` → project lives on `vendor_bill_line_items`
- `amount_paid` exists but as `amount_paid` (matches)

## Corrected Approach

### 1. AP Aging Summary View

Since `vendor_bills` has no `project_id`, the view will join through `vendor_bill_line_items` to get project info. Bills can span multiple projects, so I'll use `DISTINCT` bill-level rows with the project from line items (or NULL if none).

Corrected column mappings:
- `vb.number` instead of `vb.bill_number`
- `vb.total` instead of `vb.total_amount`
- `vb.amount_paid` stays
- `(vb.total - vb.amount_paid)` for `balance_due`
- Project comes from a lateral join to `vendor_bill_line_items`

### 2. Portfolio Summary View

The `job_cost_summary` view has all referenced columns. This SQL is valid as-is.

### Migration File

Single migration with both `CREATE OR REPLACE VIEW` statements and `GRANT SELECT` for each.

## Technical Details

- Creates two read-only views (no table modifications)
- Grants `SELECT` to `authenticated` role
- AP aging uses corrected column names and joins through line items for project context

