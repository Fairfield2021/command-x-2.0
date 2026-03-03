

# Enhance Team Tab — PO/WO Badges + Collapsible Sections

## Current State

The Team tab already renders `ProjectCustomerContactSection` and `ProjectLinkedVendorsSection` at the top. Both work correctly. What's missing:

1. **No PO vs WO distinction** — `ProjectLinkedVendorsSection` counts all POs but doesn't differentiate `order_type = 'work_order'` vs `'purchase_order'`
2. **No collapsibility** — sections are always expanded, no toggle
3. **No vendor contact info** — only shows vendor name and PO count, not email/phone

## Plan

### 1. Enhance `ProjectLinkedVendorsSection.tsx`

- Add `order_type` to the `purchase_orders` query select
- Track per-vendor: `po_count` and `wo_count` separately
- Show colored badges: blue "PO" badge with count, purple "WO" badge with count (only when > 0)
- Fetch vendor contact info (email, phone) by joining or separate query — simplest: add a second query to `vendors` table for the unique vendor IDs, or just select vendor email/phone from vendors table
- Actually, `purchase_orders` only has `vendor_id` and `vendor_name`. To get email/phone, query `vendors` table for the collected IDs.
- Display email (mailto) and phone (tel) links in each vendor card

### 2. Wrap both sections in Collapsible

- In `JobHubTeamTab.tsx`, wrap `ProjectCustomerContactSection` and `ProjectLinkedVendorsSection` in `Collapsible` components (matching the pattern from `ProjectSection.tsx` — chevron toggle, count badge)
- Default open for both
- Or simpler: add collapsible behavior directly inside each section component

Best approach: Add collapsible toggle inside each section component since they already manage their own headers.

### Files Modified

- `src/components/project-hub/ProjectLinkedVendorsSection.tsx` — Add order_type tracking, PO/WO badges, vendor contact info, collapsible wrapper
- `src/components/project-hub/ProjectCustomerContactSection.tsx` — Add collapsible wrapper
- `src/components/project-hub/tabs/JobHubTeamTab.tsx` — No changes needed (already renders both)

