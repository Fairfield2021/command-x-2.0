

# Create `CreateChangeOrderDialog` Component

## Context

The existing `useAddChangeOrder` mutation requires several fields: `customer_id`, `customer_name`, `reason`, `project_id`, `tax_rate`, `number`, and `line_items`. The `number` is auto-assigned by a DB trigger. The `change_orders` Insert schema requires `customer_id`, `customer_name`, `reason`, `number`, and `project_id` as non-optional.

Since this dialog is a simplified version for creating COs from the Financials tab (not the full `ChangeOrderForm`), it will directly insert via Supabase rather than using `useAddChangeOrder` (which demands customer info that may not be available in this context). Instead, it will insert directly into `change_orders` and `change_order_line_items`.

## Plan

**New file:** `src/components/project-hub/contract/CreateChangeOrderDialog.tsx`

### Props
- `projectId: string`
- `contractId: string | null`
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

### Form Fields
1. **Description** — `Input` (required), maps to `reason` column
2. **Type** — `RadioGroup` with "Additive (+)" / "Deductive (-)", default additive, maps to `change_type`
3. **CO Value** — numeric `Input` (required), maps to `co_value`
4. **Sent To** — `Input` (optional), maps to `sent_to`
5. **Line Items** — repeatable rows with:
   - Description (text), Qty (number), Unit (text, optional), Unit Price (currency)
   - Calculated line total per row
   - "+ Add Line" button
   - Running subtotal at bottom

### Submit Logic
- Insert into `change_orders` directly via `supabase.from("change_orders").insert(...)`:
  - `project_id`, `contract_id`, `reason` (from description), `change_type`, `co_value`, `sent_to`
  - `customer_id` and `customer_name`: will need to be derived from the project's customer or passed as empty defaults — since the schema requires them, the component will query the project to get customer info
  - `number`: set to a placeholder since the DB trigger auto-assigns it (actually the Insert type requires it — so we'll use the `generate_change_order_number` pattern or let the trigger handle it)
  - `tax_rate`: default 0
  - `subtotal`, `total`: calculated from line items
- Insert line items into `change_order_line_items`
- Invalidate `['change_orders']` queries
- Toast success, close dialog

### Approach Adjustment
Looking at the Insert type, `number`, `customer_id`, `customer_name`, `reason` are all required. The existing trigger `set_change_order_number` sets `number` before insert, but the TypeScript type still requires it. We'll pass a placeholder `''` for `number` (the trigger overwrites it). For `customer_id`/`customer_name`, we'll fetch the project's customer from the project record or accept them as optional props with fallback.

Actually, a simpler approach: add `customerId` and `customerName` as optional props (the parent component in the Financials tab likely has this context).

### Components Used
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from shadcn
- `Input`, `Label`, `Button`, `RadioGroup`, `RadioGroupItem`
- `toast` from sonner

### Technical Details
- Local state for form fields and line items array
- Line item type: `{ id: string; description: string; quantity: number; unit: string; unit_price: number }`
- Computed running total from line items
- Direct Supabase insert (bypassing `useAddChangeOrder` to avoid needing all the fields the full form requires)
- Uses `useMutation` + `useQueryClient` for invalidation
- No QB integration — purely internal record

