

# Work Order Visual Distinction

## Overview
Add visual differentiation for work orders (`order_type = "work_order"`) vs purchase orders (`order_type = "purchase_order"`) across the PO list page, card component, and detail page.

## Changes

### 1. Add `order_type` to `PurchaseOrder` interface
**File:** `src/integrations/supabase/hooks/usePurchaseOrders.ts`
- Add `order_type: string` to the `PurchaseOrder` interface (it already exists in the DB schema/types)

### 2. PO List Page — Type filter toggle + icon/prefix in table
**File:** `src/pages/PurchaseOrders.tsx`
- Add `selectedType` state: `"all" | "purchase_order" | "work_order"`
- Add a toggle group (pills) below search: "All", "Purchase Orders", "Work Orders"
- Filter `filteredPOs` by `order_type` when not "all"
- In the `number` column render: show `Wrench` icon (purple) for work orders, `ShoppingCart` icon (blue/primary) for purchase orders
- Add a purple "WO" badge next to number for work orders

### 3. PurchaseOrderCard — visual distinction
**File:** `src/components/purchase-orders/PurchaseOrderCard.tsx`
- Accept `order_type` from the PurchaseOrder (already on the type after step 1)
- Swap `ShoppingCart` → `Wrench` icon when `order_type === "work_order"`
- Show a small purple "Work Order" badge below the PO number for work orders
- Use purple left border (`border-purple-500`) instead of the status-based color for work orders

### 4. PurchaseOrderDetail — header distinction
**File:** `src/pages/PurchaseOrderDetail.tsx`
- Show `Wrench` icon + "Work Order" label instead of `ShoppingCart` + "Purchase Order" when `order_type === "work_order"`
- Add a purple badge "Work Order" next to the PO number in the header

### 5. ProjectPurchaseOrdersList — type indicator
**File:** `src/components/project-hub/ProjectPurchaseOrdersList.tsx`
- Show `Wrench` icon for work orders, `Truck` icon for POs in the list rows

No database changes required — `order_type` column already exists with default `"purchase_order"`.

