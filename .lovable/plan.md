

# Enhance SovTable with Addendum Line Styling

## Files to modify
1. `src/components/project-hub/contract/SovTable.tsx`
2. `src/components/project-hub/tabs/JobHubContractTab.tsx`

## SovTable.tsx changes

### Props update
Add optional `changeOrders` prop:
```ts
interface SovTableProps {
  contractId: string;
  lines: SovLine[];
  isLoading: boolean;
  changeOrders?: { id: string; number: string; change_type: string }[];
}
```

### Sorting and divider
- Use `useMemo` to split `lines` into `originalLines` (where `!is_addendum`) and `addendumLines` (where `is_addendum`)
- Render original lines first, then a divider row (`<TableRow>` with a single cell spanning all columns containing centered "— Addendums —" in muted text), then addendum lines
- Only show divider if addendum lines exist

### Row styling per addendum line
- If `line.is_addendum`: add `bg-blue-50 dark:bg-blue-950/20` to the `<TableRow>`
- Look up CO number from `changeOrders` array via `line.change_order_id`
- If linked CO has `change_type === 'deductive'`: show red "DED" badge instead of blue "CO" badge; show total value in red with `line-through`
- Otherwise: show blue "CO" badge with the CO number (e.g. "CO-01")

### Footer enhancement
Replace the single "Totals" row with four rows:
1. **Original Scope**: sum of `total_value` for non-addendum lines
2. **+ Addendums**: sum of `total_value` for addendum lines linked to additive COs
3. **- Deductions**: sum of `total_value` for addendum lines linked to deductive COs (shown negative)
4. **Total** (bold): grand total (existing `totals.total_value`)

Only the Total Value column needs these subtotals; other financial columns keep the existing single total row.

## JobHubContractTab.tsx changes
- Import `useChangeOrdersByContract` from `useChangeOrders` hook
- Fetch change orders for the active contract: `useChangeOrdersByContract(contract?.id ?? null)`
- Pass the result as `changeOrders` prop to `<SovTable>`

