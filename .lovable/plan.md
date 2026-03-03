

# Commitment Report + Change Order Summary Report

## Create `src/components/reports/CommitmentReport.tsx`

- **Data**: Use `usePurchaseOrders()` hook (already fetches all non-deleted POs). Filter client-side for `payment_status !== 'paid'` (the PO interface doesn't have `payment_status` but the DB does — will need to add it or use `status` field). Since the hook fetches `*`, the data includes `order_type`, `project_name`, `vendor_name`, `total`, `status`, `created_at`, `number`.
- **Filters**: Type (All/POs/WOs) filtering on `order_type`, Project dropdown, Vendor dropdown — all derived from the fetched data
- **3 KPI cards**: Open POs count+amount, Open WOs count+amount, Total Commitment Exposure (amber)
- **Sortable table**: Type (Truck+blue "PO" badge or Wrench+purple "WO" badge), Number, Vendor, Project, Amount, Status (badge), Created Date
- **Row click**: Navigate to PO detail page (existing route pattern)
- **Footer**: Total amount row
- **Export CSV**: Same Blob pattern as JobCostReport

Note: The `PurchaseOrder` interface has `status` but not `payment_status`. The existing hook fetches `*` so the raw data includes all columns. Will filter on `status` not being `completed`/`closed`/`cancelled` to represent "open" commitments, since that aligns with the operational data model.

## Create `src/components/reports/ChangeOrderSummaryReport.tsx`

- **Data**: Use `useChangeOrders()` hook (already fetches all COs with project join, `deleted_at IS NULL`). The returned data includes `change_type`, `co_value`, `approval_status`, `number`, `reason`, `description`, `created_at`, and `project: { name }`.
- **Filters**: Status (All/Draft/Pending/Approved/Rejected), Project dropdown
- **4 KPI cards**: Total Addendums (green), Total Deductions (red), Net Change (bold), Pending Approval (amber)
- **Sortable table**: CO #, Project, Description (use `reason`), Type badge (green Additive / red Deductive), Value, Status badge, Date
- **Export CSV**: Same pattern

## Modify `src/pages/ReportsPage.tsx`

- Import both components
- Render `<CommitmentReport />` when `activeReport === "commitments"`
- Render `<ChangeOrderSummaryReport />` when `activeReport === "change-orders"`
- Keep AP Aging as "Coming soon" placeholder

Both components follow the exact same structure as `JobCostReport`: filter bar + KPI cards + sortable table + footer + CSV export.

