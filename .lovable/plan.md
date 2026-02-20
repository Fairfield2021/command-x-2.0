
# Phase 2 — Cleanup: Remove Redundant Local CRUD Code

## Goal
Per the Notion tracker: after Phase 1 (QBO Popup Workflow) is verified, remove all legacy local creation/edit forms, their page routes, and their corresponding backend edge functions. QuickBooks Online is now the source of truth for all financial document creation and editing. Command X is the read-only operational dashboard.

---

## What Is Being Removed

### Frontend Pages (files to delete)

| File | Route | Reason |
|---|---|---|
| `src/pages/NewInvoice.tsx` | `/invoices/new` | Replaced by "Create in QBO" popup |
| `src/pages/EditInvoice.tsx` | `/invoices/:id/edit` | Replaced by "Edit in QBO" popup |
| `src/pages/NewEstimate.tsx` | `/estimates/new` | Replaced by "Create in QBO" popup |
| `src/pages/EditEstimate.tsx` | `/estimates/:id/edit` | Replaced by "Edit in QBO" popup |
| `src/pages/NewPurchaseOrder.tsx` | `/purchase-orders/new` | Replaced by "Create in QBO" popup |
| `src/pages/EditPurchaseOrder.tsx` | `/purchase-orders/:id/edit` | Replaced by "Edit in QBO" popup |
| `src/pages/NewVendorBill.tsx` | `/vendor-bills/new` | Replaced by "Create in QBO" popup |
| `src/pages/EditVendorBill.tsx` | `/vendor-bills/:id/edit` | Replaced by "Edit in QBO" popup |
| `src/pages/NewTimeEntryInvoice.tsx` | `/invoices/new-from-time` | Legacy time-entry invoice form |

### Frontend Components (files to delete)

| File | Used By |
|---|---|
| `src/components/invoices/InvoiceForm.tsx` | NewInvoice.tsx |
| `src/components/invoices/TimeEntryInvoiceForm.tsx` | NewTimeEntryInvoice.tsx |
| `src/components/estimates/EstimateForm.tsx` | NewEstimate.tsx |
| `src/components/purchase-orders/PurchaseOrderForm.tsx` | NewPurchaseOrder.tsx |
| `src/components/purchase-orders/PurchaseOrderEditForm.tsx` | EditPurchaseOrder.tsx |
| `src/components/vendor-bills/VendorBillForm.tsx` | NewVendorBill.tsx + EditVendorBill.tsx |

### Backend Edge Functions (to delete from Supabase)

| Function | What It Did |
|---|---|
| `quickbooks-create-invoice` | Creates invoices in QBO — now done natively in QBO |
| `quickbooks-create-estimate` | Creates estimates in QBO — now done natively in QBO |
| `quickbooks-create-purchase-order` | Creates POs in QBO — now done natively in QBO |
| `quickbooks-create-bill` | Creates bills in QBO — now done natively in QBO |
| `quickbooks-update-invoice` | Updates invoices in QBO — now done natively in QBO |
| `quickbooks-update-estimate` | Updates estimates in QBO — now done natively in QBO |
| `quickbooks-update-bill` | Updates bills in QBO — now done natively in QBO |

> Note: `quickbooks-update-vendor` is NOT removed as it handles vendor sync, not document editing. The void functions are also kept as they may be needed for operational voiding from within Command X.

---

## Routing Changes in App.tsx

Remove these route definitions:
```
/invoices/new              → NewInvoice
/invoices/new-from-time    → NewTimeEntryInvoice
/invoices/:id/edit         → EditInvoice
/estimates/new             → NewEstimate
/estimates/:id/edit        → EditEstimate
/purchase-orders/new       → NewPurchaseOrder
/purchase-orders/:id/edit  → EditPurchaseOrder
/vendor-bills/new          → NewVendorBill
/vendor-bills/:id/edit     → EditVendorBill
```

Remove all imports for deleted page components in App.tsx.

---

## Inline Link / Button Cleanup

Files that contain `navigate(...)` or buttons pointing to removed routes must be updated to either:
- **Remove** the button/link entirely (e.g., "New Invoice" button on list pages — replaced by "Create in QBO")
- **Redirect** to the list page for any dead `/edit` links

Files affected:
- `src/pages/Invoices.tsx` — remove "New Invoice" and "New from Time" buttons
- `src/pages/Estimates.tsx` — remove "New Estimate" button  
- `src/pages/PurchaseOrders.tsx` — remove "New Purchase Order" button
- `src/pages/VendorBills.tsx` — remove "New Bill" button
- `src/pages/InvoiceDetail.tsx` — remove local "Edit" button (keep QBO Edit in QBO button)
- `src/pages/VendorBillDetail.tsx` — remove local "Edit" button
- `src/pages/PurchaseOrderDetail.tsx` — remove "Duplicate" (navigates to `/new`) and local edit
- `src/pages/EstimateDetail.tsx` / `EstimateDetailView.tsx` — remove local "Edit" button
- `src/pages/Sales.tsx` — remove empty-state "create" callbacks pointing to `/new`
- `src/pages/ProjectDetail.tsx` — remove "Add New" callbacks pointing to `/vendor-bills/new` and `/purchase-orders/new`
- `src/pages/JobOrderDetail.tsx` — remove "New PO" and "Add Invoice" buttons
- `src/pages/ChangeOrderDetail.tsx` — remove "Create Invoice" button
- `src/components/estimates/EstimateCard.tsx` — remove "Continue Editing" (draft) and "Edit" buttons
- `src/components/vendor-bills/VendorBillTable.tsx` — remove "Edit" dropdown item
- `src/components/vendor-bills/SmartVendorBillDialog.tsx` — remove navigation to `/vendor-bills/new`

---

## Technical Details

### Safe Deletions (no downstream usage after link cleanup)
- All 9 page files listed above are self-contained page-level components
- Form components are only used by their corresponding New/Edit pages

### What Is NOT Removed
- `InvoiceDetail.tsx`, `EstimateDetail.tsx`, `PurchaseOrderDetail.tsx`, `VendorBillDetail.tsx` — these read-only detail views remain (they display synced data from QBO)
- `EstimateDetailView.tsx` — remains, just has the local "Edit" button removed
- All payment dialogs, attachment components, payment history — operational, not creation
- `quickbooks-void-*` functions — retained for voiding operations
- `quickbooks-sync-*`, `quickbooks-receive-payment` etc. — retained for sync operations
- `SmartVendorBillDialog.tsx` — the component itself remains but its navigation to `/vendor-bills/new` is replaced with a message that bills are created in QBO

### Risk Mitigation
Per the Notion tracker risk log: "Run TypeScript compiler checks after each deletion. Use grep to find all import references before deleting any file." The implementation follows this approach — routes and imports are removed in App.tsx first before files are deleted, ensuring no broken builds.

---

## Sequence of Implementation

1. Remove routes and imports from `App.tsx`
2. Clean up all `navigate()` calls and buttons pointing to removed routes across list pages, detail pages, and components
3. Delete the 9 legacy page files
4. Delete the 6 legacy form component files
5. Delete the 7 backend edge functions from Supabase
6. Update the Notion tracker to mark Phase 2 as complete
