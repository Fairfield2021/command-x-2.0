

# Migration: Change Order Approve/Reject Functions

## Schema Reconciliation

The user's SQL references columns/tables that don't match the actual schema. Here's what needs adjusting:

| User's SQL | Actual Schema | Fix |
|---|---|---|
| `change_order_items` table | `change_order_line_items` table | Use correct table name |
| `v_item.unit_of_measure` | Column doesn't exist on `change_order_line_items` | Use `NULL` (sov_lines has `unit` not `unit_of_measure`) |
| `v_co.approval_status` | Column exists (added in prior migration) | OK |
| `v_co.co_type` | Column doesn't exist; `change_type` exists (enum) | Use `v_co.change_type` |
| `v_co.co_value` | Column exists (added in prior migration) | OK |
| `sov_lines.source` | Column doesn't exist | Skip — use `is_addendum = true` instead |
| `sov_lines.unit_of_measure` | Column is `unit` | Use `unit` |
| `sov_lines.project_id` | Column doesn't exist on `sov_lines` | Skip — contract_id is sufficient |

## Migration SQL (corrected)

**`approve_change_order`:**
- Reads from `change_order_line_items` (not `change_order_items`)
- Inserts into `sov_lines` using actual columns: `contract_id`, `line_number`, `description`, `product_id`, `unit` (from line item or null), `quantity`, `unit_price`, `markup`, `is_addendum = true`, `change_order_id`
- Checks `approval_status` (the new column) for idempotency
- Uses `change_type` (existing enum) instead of `co_type` for deductive check
- Updates `approval_status`, `approval_date` (new columns), and `approved_by` (existing column)
- Handles deductive COs by incrementing `contracts.deduction_value`
- `SECURITY DEFINER` with `search_path = public`

**`reject_change_order`:**
- Simple status update to `approval_status = 'rejected'`
- `SECURITY DEFINER` with `search_path = public`

No code files modified. No existing functions altered.

