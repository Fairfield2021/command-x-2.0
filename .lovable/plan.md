

# LinkLineItemsToSOV Component

## Purpose
A table UI that displays all line items from a PO, vendor bill, or invoice and lets users link each line to an SOV line via the existing `SovLinePicker`. Includes overcommit validation before saving.

## Data Flow
- PO/bill/invoice → `project_id` → look up the contract for that project via `useContractsByProject(projectId)` → pass `contract.id` to `SovLinePicker`
- Each row shows: line description, quantity, total, and a `SovLinePicker` dropdown
- On change, validate that assigning this line item won't cause the SOV line's committed/billed/invoiced total to exceed `total_value`

## Component: `src/components/shared/LinkLineItemsToSOV.tsx`

**Props:**
- `lineItems: Array<{ id, description, quantity, unit_price, total, sov_line_id }>` — the line items to display
- `projectId: string` — used to look up the project's contract
- `contextType: "po" | "bill" | "invoice"`
- `onSave: (updates: Array<{ lineItemId: string; sovLineId: string | null }>) => Promise<void>`
- `disabled?: boolean`

**Behavior:**
1. Fetches contract via `useContractsByProject(projectId)` — if no contract exists, shows an info message ("No contract found for this project")
2. Renders a table with columns: Line #, Description, Amount, SOV Line (SovLinePicker)
3. Tracks local state of `sov_line_id` per line item (initialized from props)
4. **Overcommit validation**: Before saving, for each SOV line being assigned, sums the total of all line items targeting that SOV line (including existing DB values from `useSovLines`) and compares against `total_value`. If any SOV line would be overcommitted, shows a warning toast and blocks save.
5. "Save Links" button only enabled when there are unsaved changes
6. Uses `supabase.from(tableName).update({ sov_line_id }).eq("id", lineItemId)` for each changed row, where `tableName` is derived from `contextType` (`po_line_items`, `vendor_bill_line_items`, `invoice_line_items`)

## Integration Points
- Will be added to `PurchaseOrderDetail.tsx`, `VendorBillDetail` (in `VendorBillTable.tsx`), and `InvoiceDetail.tsx` as a collapsible section below or within the existing line items card
- Each detail page already has `project_id` available

## Files to Create/Modify
1. **Create** `src/components/shared/LinkLineItemsToSOV.tsx` — the new component
2. **Modify** `src/pages/PurchaseOrderDetail.tsx` — add the component below the line items card
3. **Modify** invoice and bill detail pages similarly (or defer to next prompt)

## Overcommit Validation Logic
```
For each SOV line targeted by the pending assignments:
  existingTotal = sovLine.committed_cost (or billed_to_date / invoiced_to_date per context)
  pendingAdds = sum of line item totals being newly assigned to this SOV line
  pendingRemoves = sum of line item totals being unassigned from this SOV line
  newTotal = existingTotal + pendingAdds - pendingRemoves
  if newTotal > sovLine.total_value → block with warning
```

No database changes required — `sov_line_id` FK already exists on all three line item tables.

