

# Cannot Create Requested Tables — They Already Exist

The database already has both `tm_tickets` and `tm_ticket_line_items` tables with RLS policies enabled.

## Current State

**`tm_tickets`** already exists with columns: `id`, `ticket_number`, `project_id`, `customer_id`, `vendor_id`, `purchase_order_id`, `status` (enum `tm_ticket_status`), `description`, `work_date`, `created_in_field`, customer rep fields, signature fields, `subtotal`, `tax_rate`, `tax_amount`, `total`, `notes`, `created_by`, `created_at`, `updated_at`, `change_type`.

**`tm_ticket_line_items`** exists with: `id`, `tm_ticket_id`, `product_id`, `description`, `quantity`, `unit_price`, `markup`, `total`, `is_taxable`, `sort_order`, `created_at`.

**RLS policies** are already in place on both tables.

The `generate_tm_ticket_number()` function also already exists.

## Options

The requested schema differs significantly from what's already in the database (e.g., your request has `hourly_rate`, `hours_logged`, `cap_hours`, `tm_ticket_entries` vs the existing `tm_ticket_line_items` with product-based line items). Creating these tables would conflict with the existing ones.

**Recommended paths forward:**
1. **Alter the existing tables** — Add the missing columns (`hourly_rate`, `hours_logged`, `cap_hours`, `contract_id`, `before_photo_url`, `after_photo_url`, `change_order_id`, `approved_by`, `approval_date`) to the existing `tm_tickets` table, and create `tm_ticket_entries` as a new companion table alongside the existing `tm_ticket_line_items`.
2. **Rename and replace** — Drop the existing tables and recreate with the new schema (destructive, not recommended if data exists).
3. **Use a different table name** — e.g., `tm_work_tickets` and `tm_work_entries` to avoid conflicts.

Please let me know which approach you'd like to take, and I'll prepare the migration accordingly.

