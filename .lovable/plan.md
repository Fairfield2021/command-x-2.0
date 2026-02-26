

# Phase 6A — Step 5 of 8: SovTable Component

## New File

**`src/components/project-hub/contract/SovTable.tsx`**

## Component Structure

```text
SovTable
├── Toolbar: "Add Line" button + line count
├── DataTable (existing shared component pattern):
│   ├── Columns: #, Description, Qty, Unit, Unit Price, Markup%, Total Value,
│   │   Committed, Actual, Billed, Paid, Balance, %Complete, Actions
│   └── Footer Row: Column totals for financial columns
├── Inline Edit: Click row → opens edit dialog (or inline inputs)
├── Add Line Dialog: Form to create new SOV line
└── Delete Confirmation: AlertDialog before removing a line
```

## Props

| Prop | Type | Source |
|------|------|--------|
| contractId | `string` | Parent tab |
| lines | `SovLine[]` | From `useSovLines` |
| isLoading | `boolean` | From `useSovLines` |

## Implementation Details

- Uses `Table/TableHeader/TableBody/TableRow/TableCell/TableFooter` from `@/components/ui/table`
- Uses `useSovLines`, `useAddSovLine`, `useUpdateSovLine`, `useDeleteSovLine` hooks
- `formatCurrency` for all money columns
- Add Line: `Dialog` with form fields (description, quantity, unit, unit_price, markup, notes) using existing `Input`, `Label`, `Button` components
- Edit: Click pencil icon → same dialog pre-filled with line data
- Delete: `AlertDialog` confirmation before calling `useDeleteSovLine`
- Footer row sums: total_value, committed_cost, actual_cost, billed_to_date, paid_to_date, balance_remaining
- Addendum lines get a `Badge` indicator (blue "Addendum")
- Compact table styling matching `DataTable` patterns (`text-xs`, tight padding)
- Auto-calculates `line_number` as max existing + 1 on add
- `sort_order` defaults to `line_number` value

## What Does NOT Change

- No database changes
- No hook changes
- No modifications to existing components
- Component is created but not wired into any tab yet (Step 7)

