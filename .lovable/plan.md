

# Replace Change Orders Section in JobHubFinancialsTab

## What Changes

**File:** `src/components/project-hub/tabs/JobHubFinancialsTab.tsx` (only file modified)

### New Imports
- `useState, useEffect` from React
- `useChangeOrdersByProject, useApproveChangeOrder, useRejectChangeOrder, useUpdateChangeOrderStatus` from `useChangeOrders` hook
- `CreateChangeOrderDialog` from `contract/CreateChangeOrderDialog`
- `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
- `AlertDialog` components for approve confirmation
- `supabase` for getting current user
- `ChevronDown, CheckCircle, XCircle, RotateCcw` icons

### Remove
- `ProjectChangeOrdersList` import and usage (line 15, line 265)
- `changeOrders` from props interface and destructuring (no longer passed in — fetched internally via `useChangeOrdersByProject`)

### Add State
- `coDialogOpen` for CreateChangeOrderDialog
- `approveConfirmCO` for the confirmation dialog (stores the CO being approved)
- `currentUserId` from `supabase.auth.getUser()` on mount

### Replace the `<ProjectChangeOrdersList>` line (265) with new inline section:

**Section Structure:**
1. `Collapsible` wrapper (default open)
2. Header row with:
   - Section title: "Change Orders" + count badge
   - Summary: "Addendums: +$X | Deductions: -$Y | Net: $Z" (computed from `useChangeOrdersByProject` data)
   - "+ New Change Order" button → opens `CreateChangeOrderDialog`
   - Chevron toggle for collapsible
3. `CollapsibleContent` with card-based list:
   - Each CO renders as a card showing:
     - `co.number` bold heading
     - `co.reason` truncated to 2 lines (via `line-clamp-2`)
     - Type badge: green "Additive" or red "Deductive" based on `change_type`
     - Value with +/- prefix, formatted currency (uses `co_value` or falls back to `co.total`)
     - Approval status badge with colors (draft=gray, pending_approval=amber, approved=green, rejected=red)
     - `sent_to` if present
     - `created_at` formatted date
   - Action buttons per status:
     - **draft**: "Submit for Approval" → calls `useUpdateChangeOrderStatus` with `pending_approval`
     - **pending_approval**: Green "Approve" + Red "Reject" buttons
       - Approve opens AlertDialog confirmation: "Approving this CO will add N new SOV lines and increase/decrease contract value by $Y. Proceed?"
       - On confirm → calls `useApproveChangeOrder({ changeOrderId, approvedBy: currentUserId })`
       - Reject → calls `useRejectChangeOrder({ changeOrderId, rejectedBy: currentUserId })`
     - **approved**: No buttons, show `approval_date` and "Approved" info
     - **rejected**: "Reopen as Draft" → calls `useUpdateChangeOrderStatus` with `draft`

4. `CreateChangeOrderDialog` rendered with `projectId`, `contractId` from `summary?.contract_id`, `open`, `onOpenChange`

### Summary Calculation
```
totalAddendums = sum of co_value where change_type === 'additive'
totalDeductions = sum of co_value where change_type === 'deductive'
netChange = totalAddendums - totalDeductions
```

### Technical Notes
- The `changeOrders` prop and `ProjectChangeOrdersList` are removed from this component. The CO data is now fetched directly via `useChangeOrdersByProject(projectId)`.
- The parent component passing `changeOrders` prop will need its interface updated — but since we're only modifying this file, we keep the prop in the interface but simply ignore it, using the hook data instead.
- Actually, to avoid breaking the parent, we'll keep `changeOrders` in the props interface but won't use it. The hook-fetched data takes precedence.

