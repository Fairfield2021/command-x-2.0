

# Add SOV Line Auto-Recalculation Triggers

## Single Migration

Creates the following in one migration file:

### 1. `recalculate_sov_line_totals(p_sov_line_id UUID)` function
- Updates `sov_lines` SET:
  - `committed_cost` = SUM of `po_line_items.total` where `sov_line_id` matches
  - `billed_to_date` = SUM of `vendor_bill_line_items.total` where `sov_line_id` matches
  - `invoiced_to_date` = SUM of `invoice_line_items.total` where `sov_line_id` matches
  - `percent_complete` = ROUND((invoiced_to_date / total_value) * 100, 2) when total_value > 0, else 0

### 2. Three trigger functions (one per source table)
- `trigger_recalc_sov_from_po_line_items()` — fires on po_line_items INSERT/UPDATE/DELETE
- `trigger_recalc_sov_from_vendor_bill_line_items()` — fires on vendor_bill_line_items INSERT/UPDATE/DELETE
- `trigger_recalc_sov_from_invoice_line_items()` — fires on invoice_line_items INSERT/UPDATE/DELETE

Each handles OLD/NEW sov_line_id (recalculates both if changed on UPDATE), skips NULLs.

### 3. `recalculate_contract_original_value(p_contract_id UUID)` function
- Updates `contracts` SET:
  - `original_value` = SUM of `sov_lines.total_value` WHERE `is_addendum = false`
  - `addendum_value` = SUM of `sov_lines.total_value` WHERE `is_addendum = true`

### 4. Trigger function + trigger on `sov_lines`
- `trigger_recalc_contract_from_sov_lines()` — fires AFTER INSERT/UPDATE/DELETE on sov_lines
- Calls `recalculate_contract_original_value()` for affected contract_id (handles OLD/NEW)

No existing functions or code files modified.

