
# Phase 1 — QuickBooks Popup Workflow

## What Notion Specifies

The goal is to make QuickBooks Online the single source of truth for financial document creation and editing. Command X becomes the operational dashboard that links out to QBO via deep-link popups and stays in sync via webhooks.

**Key architectural decision from the Notion Decision Log (2026-02-19):**
- The `qbo_deep_link_url` database column was explicitly dropped — the URL is built on the fly from the existing transaction ID in the mapping tables. No DB migration needed.
- Existing local "New Invoice/Estimate/PO/Bill" forms are **preserved** alongside the new "Create in QBO" buttons. Deletion happens in Phase 2 after verification.

**Estimated effort: ~36 hours across 15 tasks**

---

## Current State (Confirmed by Code Inspection)

### Mapping tables that already exist:
| Table | QB ID Column |
|-------|-------------|
| `quickbooks_invoice_mappings` | `quickbooks_invoice_id` |
| `quickbooks_estimate_mappings` | `quickbooks_estimate_id` |
| `quickbooks_po_mappings` | `quickbooks_po_id` |
| `quickbooks_bill_mappings` | `quickbooks_bill_id` |

These are already populated when a document is synced. The QB transaction IDs needed for deep links already exist in the database.

### Webhook gap confirmed:
In `quickbooks-webhook/index.ts`, when a QBO-originated **Create** arrives for an estimate, invoice, or bill with no local mapping, the current code does:
```
return { success: true, skipped: true, reason: "No local mapping" };
```
Phase 1 changes this to an **upsert** — creating a new local record when one doesn't exist.

### QBOPopupLink does not exist yet. `useQBMappingForList` does not exist yet.

---

## Deep Link URL Patterns

| Action | Document | URL |
|--------|----------|-----|
| Create New Invoice | Invoice | `https://app.qbo.intuit.com/app/invoice` |
| View/Edit Invoice | Invoice | `https://app.qbo.intuit.com/app/invoice?txnId={quickbooks_invoice_id}` |
| Create New Estimate | Estimate | `https://app.qbo.intuit.com/app/estimate` |
| View/Edit Estimate | Estimate | `https://app.qbo.intuit.com/app/estimate?txnId={quickbooks_estimate_id}` |
| Create New PO | Purchase Order | `https://app.qbo.intuit.com/app/purchaseorder` |
| View/Edit PO | PO | `https://app.qbo.intuit.com/app/purchaseorder?txnId={quickbooks_po_id}` |
| Create New Bill | Bill | `https://app.qbo.intuit.com/app/bill` |
| View/Edit Bill | Bill | `https://app.qbo.intuit.com/app/bill?txnId={quickbooks_bill_id}` |

---

## Files to Create

### 1. `src/components/quickbooks/QBOPopupLink.tsx`
A reusable component that:
- Takes `docType` (`invoice | estimate | purchase_order | bill`), optional `txnId` (for existing docs), and `variant` (`create | edit`)
- Builds the deep link URL on the fly — no DB column needed
- Opens a popup via `window.open()` called **synchronously** from the click handler (required for browser popup permission)
- Detects if `window.open()` returned `null` (popup blocked) and shows a toast with guidance: "Popup blocked — please allow popups for this site"
- When the popup closes (detected via `postMessage` or polling `popup.closed`), waits 2 seconds and then calls a provided `onClose` callback to trigger a refetch
- Shows as disabled with a tooltip if QB is not connected (`qbConfig?.is_connected === false`)
- Two visual variants: a primary button ("Create in QBO") and a ghost icon button ("Edit in QBO" with an ExternalLink icon)

### 2. `src/integrations/supabase/hooks/useQBMappingForList.ts`
A lightweight query hook that:
- Takes an array of entity IDs (invoice IDs, estimate IDs, etc.) and a `docType`
- Queries the appropriate mapping table (`quickbooks_invoice_mappings`, etc.) and returns a `Map<entityId, qbTxnId>`
- Only fires when `qbConfig?.is_connected === true`
- Enables the per-row "Edit in QBO" buttons in list pages

---

## Files to Modify

### 3. `src/pages/Invoices.tsx`
- Import `QBOPopupLink` and `useQBMappingForList`
- Add to the page header actions: **"Create in QBO"** button (next to existing "New Invoice" button), only visible when QB is connected
- In the columns definition, add to the `actions` column: **"Edit in QBO"** icon button, only rendered when the invoice has a mapping (i.e., `qbMappings.get(item.id)` is defined)
- The `onClose` callback for both buttons triggers `refetch()`

### 4. `src/pages/Estimates.tsx`
- Same pattern as Invoices.tsx
- "Create in QBO" header button + per-row "Edit in QBO" icon button
- `onClose` triggers `refetch()`

### 5. `src/pages/PurchaseOrders.tsx`
- Same pattern
- "Create in QBO" header button + per-row "Edit in QBO" icon button

### 6. `src/pages/VendorBills.tsx`
- Same pattern
- "Create in QBO" header button (next to existing "Smart Create" and "New Bill" buttons) + per-row "Edit in QBO" button via `VendorBillTable` component update

### 7. `src/pages/InvoiceDetail.tsx`
- Import `QBOPopupLink`
- Add **"Edit in QBO"** button to the page header actions, displayed when the invoice has a QB mapping
- Use `useQuickBooksInvoiceMapping(id)` (already exists in hooks) to check if mapped
- `onClose` triggers `refetch()`

### 8. `src/pages/EstimateDetail.tsx` → delegates to `EstimateDetailView`
- Modify `src/components/estimates/EstimateDetailView.tsx`
- Add "Edit in QBO" to the action buttons area, using `useQuickBooksEstimateMapping(estimateId)` (already exists)

### 9. `src/pages/PurchaseOrderDetail.tsx`
- Add "Edit in QBO" button using `useQuickBooksPOMapping(id)` (already exists)

### 10. `src/pages/VendorBillDetail.tsx`
- Add "Edit in QBO" button using `useQuickBooksBillMapping(id)` (already exists)

---

## Backend Change: Webhook Upsert for QBO-Originated Creates

### 11. `supabase/functions/quickbooks-webhook/index.ts`

Currently, when QBO fires a `Create` event for an invoice, estimate, or bill that has no local mapping, the webhook skips it:
```typescript
// CURRENT (lines 1232-1236, 1403-1406, 1605-1609):
if (!mapping) {
  return { success: true, skipped: true, reason: "No local mapping" };
}
```

**Change:** When the operation is `Create` and there is no local mapping, create a new local record from the QBO data.

The webhook already fetches the full QBO document (invoice, estimate, bill) from the QBO API to do updates. The same fetched data is used to populate a new local record.

For **invoices**: Create a new row in `invoices` with data from the QBO invoice (doc number, customer, total, line items), then insert a row in `quickbooks_invoice_mappings`.

For **estimates**: Same pattern with `estimates` and `quickbooks_estimate_mappings`.

For **bills**: Same pattern with `vendor_bills` and `quickbooks_bill_mappings`.

For **purchase orders**: POs are less common to originate in QBO, so the skip behavior is acceptable for now. Bills, invoices, and estimates are the priority.

**The existing customer and vendor Create handling already does this correctly** (lines 831-900 for customers, 1057-1120 for vendors). The new invoice/estimate/bill upsert logic follows the exact same pattern.

---

## Notion Task Checklist Mapping

| Notion Task | Implementation |
|-------------|---------------|
| Create QBOPopupLink component | `src/components/quickbooks/QBOPopupLink.tsx` |
| Create useQBMappingForList hook | `src/integrations/supabase/hooks/useQBMappingForList.ts` |
| Update Invoices.tsx | Add Create + Edit in QBO |
| Update Estimates.tsx | Add Create + Edit in QBO |
| Update PurchaseOrders.tsx | Add Create + Edit in QBO |
| Update VendorBills.tsx | Add Create + Edit in QBO |
| Update InvoiceDetail.tsx | Add Edit in QBO to header |
| Update EstimateDetail.tsx | Add Edit in QBO to header |
| Update PurchaseOrderDetail.tsx | Add Edit in QBO to header |
| Update VendorBillDetail.tsx | Add Edit in QBO to header |
| Add popup blocked detection with toast | Part of QBOPopupLink |
| Add 2-second delay after popup close | Part of QBOPopupLink |
| Enhance quickbooks-webhook for upsert | Lines ~1232, ~1403, ~1605 in webhook |

---

## What is NOT Changed in Phase 1

Per the Notion Decision Log, the following are **preserved** and will only be removed in Phase 2:
- `NewInvoice.tsx`, `EditInvoice.tsx`, `NewEstimate.tsx`, `EditEstimate.tsx`, `NewPurchaseOrder.tsx`, `EditPurchaseOrder.tsx`, `NewVendorBill.tsx`, `EditVendorBill.tsx`
- `InvoiceForm`, `EstimateForm`, `PurchaseOrderForm`, `SmartVendorBillDialog`
- All `quickbooks-create-*` and `quickbooks-update-*` edge functions

These are deliberately kept so the transition can be verified end-to-end before the delete phase.

---

## Risk Assessment

- **QBOPopupLink:** Low risk — new component, no existing code modified. Popup blocked detection is a UX enhancement, not a critical path.
- **List page changes:** Low risk — additive only. The existing "New Invoice" etc. buttons remain untouched.
- **Detail page changes:** Low risk — additive only. The "Edit in QBO" button only appears when a mapping exists.
- **Webhook upsert:** Medium risk — this is the most significant change. A bug here could create duplicate records. Mitigation: the upsert logic uses the QB transaction ID as the idempotency key — if a mapping row already exists, it updates rather than inserts.
- **No DB migrations needed** — confirmed by the Notion Decision Log decision from 2026-02-19.

---

## Implementation Order

1. Create `QBOPopupLink.tsx` (foundation — everything else depends on this)
2. Create `useQBMappingForList.ts` (foundation for list pages)
3. Update all 4 list pages (Invoices, Estimates, PurchaseOrders, VendorBills)
4. Update all 4 detail pages (InvoiceDetail, EstimateDetail, PurchaseOrderDetail, VendorBillDetail)
5. Update `quickbooks-webhook` upsert logic for Create events
6. Deploy and test E2E
