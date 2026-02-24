

# Phase 4d Completion — Module Reorganization (4 tasks)

## Task 1: Sales Pipeline/Funnel View

**Current state**: `/sales` has two tabs (Estimates, Invoices) with flat card grids.

**Plan**: Add a third tab "Pipeline" as the default view, showing a horizontal funnel with stages derived from the existing `estimate_status` and `invoice_status` enums:

| Stage | Source | Logic |
|-------|--------|-------|
| Lead | Estimates with `status = 'draft'` | New/unqualified |
| Estimate | Estimates with `status = 'pending'` or `'sent'` | Sent to customer |
| Proposal | Estimates with `status = 'approved'` | Customer approved, not yet invoiced |
| Won | Invoices with `status = 'paid'` | Collected revenue |
| Lost | Estimates with `status = 'closed'` | Closed without winning |

Each stage column shows:
- Stage name and icon
- Count of records
- Total dollar value
- Colored bar proportional to count

The funnel is a horizontal card strip on desktop, vertical stack on mobile. No new database tables — purely computed from existing `estimates` + `invoices` queries.

**File changes**:
- Create `src/components/sales/SalesPipeline.tsx` — pipeline funnel component
- Edit `src/pages/Sales.tsx` — add Pipeline tab (3-col TabsList), make it default

---

## Task 2: Delete Legacy Nav Files

All confirmed unused (only commented-out imports in App.tsx, no live references outside the folder):

**Delete**:
- `src/components/layout/netsuite/` (entire folder — 10 files)
- `src/components/layout/BottomNav.tsx`

**Edit**:
- `src/App.tsx` — remove the commented-out import lines (lines 25-27)

---

## Task 3: Clean Up Orphaned Routes

**In `src/App.tsx`**:
- Line 450: Change `<Route path="/settings" element={<Settings />} />` to `<Navigate to="/company" replace />`
- Line 457: Change `<Route path="/user-management" element={<UserManagement />} />` to `<Navigate to="/company" replace />`
- Remove the `Settings` and `UserManagement` imports (lines 63-64) since they'll be redirects now

Note: `/settings/quickbooks` and `/settings/expense-categories` remain as standalone routes — they are sub-pages, not redirected.

---

## Task 4: Regression Test

After implementing tasks 1-3, walk through every sidebar section on desktop and mobile:

**Desktop (1920px)**:
- Home → `/` renders dashboard
- Workspace: Jobs, Sales (pipeline tab), Estimates, Invoices, POs, Vendor Bills, Time Tracking
- People: Directory, Personnel, Staffing
- Company: Company Hub, Products
- Verify `/settings` redirects to `/company`
- Verify `/user-management` redirects to `/company`

**Mobile (390x844)**:
- Bottom nav: Home, Jobs, +, Sales, More
- Pipeline view stacks vertically
- No 404s on any link

---

## Technical Details

- No database changes needed
- No new dependencies
- Pipeline computation is client-side from existing TanStack Query hooks (`useEstimates`, `useInvoices`)
- Empty state: when both queries return empty, show a "No sales data yet" message with CTA buttons

