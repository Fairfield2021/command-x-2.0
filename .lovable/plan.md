

# Database Migration: Payment Status Columns & SOV Recalculation

## Single Migration File
**Create:** `supabase/migrations/20260302_add_payment_status_columns.sql`

### Contents

1. **`purchase_orders.payment_status`** — `TEXT NOT NULL DEFAULT 'committed'` (values: committed, partially_paid, paid)
2. **`vendor_bills.payment_status`** — `TEXT NOT NULL DEFAULT 'unpaid'` (values: unpaid, partially_paid, paid)
3. **`vendor_bills.amount_paid`** — `NUMERIC NOT NULL DEFAULT 0`
4. **Replace `recalculate_sov_line_totals`** — adds `paid_to_date` calculation by joining `vendor_bill_line_items` → `vendor_bills` where `payment_status = 'paid'`; uses `total_value` from `sov_lines` for percent_complete instead of `quantity * unit_price`
5. **New trigger function `trigger_recalc_sov_from_bill_payment`** — fires `AFTER UPDATE OF payment_status ON vendor_bills` and recalculates all linked SOV lines

### Technical Notes
- The replaced function keeps `SECURITY DEFINER` and `SET search_path TO 'public'` consistent with existing conventions
- The `percent_complete` formula references `total_value` (a generated column on `sov_lines`) instead of raw `quantity * unit_price`, which is safer since `total_value` already accounts for markup
- No code file changes — migration only

