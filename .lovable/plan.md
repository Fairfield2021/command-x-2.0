

# Enhance ContractHeader with CO Context

## Files to modify
1. `src/components/project-hub/contract/ContractHeader.tsx`
2. `src/components/project-hub/tabs/JobHubContractTab.tsx`

## ContractHeader.tsx

### New prop
Accept `changeOrders` array (same shape already available from `useChangeOrdersByContract`):
```ts
changeOrders?: { id: string; change_type: string; status: string; co_value?: number }[];
```

### Financial card enhancements
- Compute from `changeOrders`:
  - `approvedAdditive` = count where `change_type === 'additive'` and `status === 'approved'`
  - `approvedDeductive` = count where `change_type === 'deductive'` and `status === 'approved'`
  - `pendingCount` = count where `status === 'pending_approval'`
  - `totalCount` = total length
  - `approvedCount` = count where `status === 'approved'`
- Addendums card: add subtitle `"{N} approved COs"`, make card clickable (scrolls to CO section via `document.getElementById`)
- Deductions card: same pattern with deductive count
- Both cards get `cursor-pointer hover:ring-1` styling when COs exist

### CO mini summary strip
Below the 4 financial cards, render a compact horizontal strip:
- Format: `"X pending approval | Y approved | Z total"`
- If `pendingCount > 0`, show an amber dot before the pending count
- Styled as a small muted-text row with flex layout

### Pending approval banner
If `contract.status === 'active'` and `pendingCount > 0`:
- Render a subtle amber banner below the summary strip
- Text: `"⚠ X change orders awaiting approval"`
- Uses `bg-amber-50 dark:bg-amber-950/20 border-amber-200` styling

## JobHubContractTab.tsx

Line 99: Pass `changeOrders` to `ContractHeader`:
```tsx
<ContractHeader contract={contract} customerName={null} changeOrders={changeOrders} />
```

