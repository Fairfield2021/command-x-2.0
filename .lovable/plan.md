

# "View in QBO" Links on Job Hub Financials Tab

## Current State

The file **already implements** QBO links for Estimates and Invoices DataTables (lines 115-158). The `poQBMap` is fetched (line 121) but unused. Vendor bill mappings are not fetched at all.

The Purchase Orders and Vendor Bills sections delegate rendering to child components (`ProjectPurchaseOrdersList` and `ProjectVendorBillsList`), which don't accept QBO mapping props.

## Problem

The user requested modifying ONLY `JobHubFinancialsTab.tsx`, but PO and vendor bill rows are rendered inside separate child components. To add per-row QBO links to those sections, the child components must also be modified to accept and render QBO data.

## Plan

### 1. `ProjectPurchaseOrdersList.tsx` — Accept optional `qbMappings` prop
- Add `qbMappings?: Map<string, string>` to props interface
- In each PO row, if `qbMappings.get(po.id)` exists, render a `QBOPopupLink` (variant="edit", icon-only) next to the existing `ExternalLink` icon
- Import `QBOPopupLink`

### 2. `ProjectVendorBillsList.tsx` — Accept optional `qbMappings` prop
- Add `qbMappings?: Map<string, string>` to props interface
- In each bill row, if `qbMappings.get(bill.id)` exists, render a `QBOPopupLink` (variant="edit", icon-only) inside the actions area (next to the dropdown menu)
- Import `QBOPopupLink`

### 3. `JobHubFinancialsTab.tsx` — Wire up bill mappings and pass maps to children
- Add `useVendorBills` import and query for project vendor bill IDs
- Add `useQBMappingForList(billIds, "bill")` to get vendor bill QB mappings
- Pass `qbMappings={poQBMap}` to `<ProjectPurchaseOrdersList>`
- Pass `qbMappings={billQBMap}` to `<ProjectVendorBillsList>`
- Import `useQuickBooksConfig` and conditionally skip passing maps when QB is disconnected

### Files Modified
- `src/components/project-hub/tabs/JobHubFinancialsTab.tsx`
- `src/components/project-hub/ProjectPurchaseOrdersList.tsx`
- `src/components/project-hub/ProjectVendorBillsList.tsx`

