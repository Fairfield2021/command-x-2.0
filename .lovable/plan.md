

# Wire SOV Linking into the Contract Tab

## What We're Building
Add a new section below the SOV table in `JobHubContractTab` that shows all project POs/WOs in an accordion. Each accordion item expands to show the `LinkLineItemsToSOV` UI for that PO's line items. Above the accordion, a coverage summary bar shows how much of the contract value is covered by linked line items.

## Changes

### 1. Pass `projectPurchaseOrders` into `JobHubContractTab`
**File:** `src/pages/ProjectDetail.tsx`
- Add `projectPurchaseOrders` prop to `<JobHubContractTab>`

**File:** `src/components/project-hub/tabs/JobHubContractTab.tsx`
- Add `projectPurchaseOrders: PurchaseOrder[]` to props interface

### 2. Create `ContractCoverageSummary` component
**File:** `src/components/project-hub/contract/ContractCoverageSummary.tsx` (new)

A small card showing:
- Contract total value (from `sovLines`)
- Total linked (sum of all PO/bill/invoice line items that have a `sov_line_id`)
- Total unlinked
- A progress bar showing % coverage
- Uses the SOV line data already available from `useSovLines` — specifically `committed_cost` (sum of linked PO line items) as the "linked POs" total

### 3. Create `ContractPOAccordion` component
**File:** `src/components/project-hub/contract/ContractPOAccordion.tsx` (new)

- Uses Radix `Accordion` (already installed)
- Receives `projectPurchaseOrders` and `projectId`
- Each PO/WO is an accordion item showing: icon (Truck/Wrench), number, vendor name, status badge, total
- When expanded, fetches that PO's line items via a query (`po_line_items` where `purchase_order_id = po.id`) and renders `<LinkLineItemsToSOV>` inside
- Groups by type: POs first, then WOs (or interleaved with visual distinction via the existing purple/primary styling)

### 4. Wire into `JobHubContractTab`
**File:** `src/components/project-hub/tabs/JobHubContractTab.tsx`

Below `<SovTable>`, add:
1. `<ContractCoverageSummary>` — shows committed/billed/invoiced coverage of total contract value
2. `<ContractPOAccordion>` — accordion of POs/WOs with linking UI

### 5. Add a hook for fetching PO line items by PO ID
**File:** `src/integrations/supabase/hooks/usePurchaseOrders.ts`

Add `usePOLineItems(poId: string)` — queries `po_line_items` table for a given PO. This keeps the accordion lightweight (line items only fetched on expand).

## Technical Details

- **No database changes** — all data already exists
- **Lazy loading**: PO line items are fetched only when the accordion item is opened, using the `usePOLineItems` hook with `enabled: !!poId && isExpanded`
- **Coverage calculation**: Uses the existing `sovLines` data — `committed_cost` already represents the sum of linked PO line items (maintained by DB triggers). The summary bar shows `sum(committed_cost) / sum(total_value)` as committed coverage
- **Query invalidation**: `LinkLineItemsToSOV.onSave` already calls `onSave?.()` — the accordion will pass a callback that invalidates `sov_lines` and `po_line_items` queries

