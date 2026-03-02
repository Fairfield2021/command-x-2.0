

# Enhance useChangeOrders Hook

The existing hook at `src/integrations/supabase/hooks/useChangeOrders.ts` already has most of the requested functionality. Here's what needs to change:

## 1. Update `ChangeOrder` interface (lines 26-71)
Add the new columns from the migration:
- `contract_id: string | null`
- `co_value: number`
- `sent_to: string | null`
- `qb_estimate_id: string | null`
- `approval_status: string` (the new column, distinct from existing `status`)
- `approval_date: string | null`

Note: `co_number` maps to existing `number` column, `co_type` maps to existing `change_type` — no changes needed for those.

## 2. Add `useChangeOrdersByContract` (new function, after line ~175)
- Queries `change_orders` WHERE `contract_id = contractId` and `deleted_at IS NULL`
- Ordered by `number` ASC
- Query key: `['change-orders-by-contract', contractId]`
- Enabled only when `contractId` is truthy

## 3. Add `useApproveChangeOrder` (new function, after existing status hooks ~line 500)
- Calls `supabase.rpc('approve_change_order', { p_change_order_id, p_approved_by })`
- On success: invalidates `['change_orders']`, `['sov_lines']`, `['contracts']`, `['job-cost-summary']`
- Toast success/error messages

## 4. Add `useRejectChangeOrder` (new function, after approve)
- Calls `supabase.rpc('reject_change_order', { p_change_order_id, p_rejected_by })`
- On success: invalidates `['change_orders']`
- Toast success/error messages

## No breaking changes
All existing exports remain intact. The `useAddChangeOrder` already serves as "create" — no new create hook needed since the user's request maps to the existing one. The `useChangeOrdersByProject` already exists and selects `*` (which includes all new columns automatically).

