

# Phase 6A — Step 4 of 8: ContractHeader Component

## What This Step Does

Creates a `ContractHeader` component — a summary bar displayed at the top of the Contract tab showing contract metadata and four financial cards. It follows the same visual patterns used by `ProjectFinancialSummary` (StatCard layout, `glass border-border` cards, `formatCurrency`, status badges).

## New File

**`src/components/project-hub/contract/ContractHeader.tsx`**

## Component Structure

```text
ContractHeader
├── Top Row: Contract # | Title | StatusBadge | Customer | Date Signed
└── Financial Cards (4-column grid):
    ├── Original Value   (neutral)
    ├── Addendums        (blue, + prefix)
    ├── Deductions       (red, - prefix)
    └── Current Value    (primary, highlighted)
```

## Props

| Prop | Type | Source |
|------|------|--------|
| contract | `Contract` (from `useContracts`) | Parent tab component |
| customerName | `string \| null` | Resolved from customer_id |

## Implementation Details

- Imports `Contract` type from `src/hooks/useContracts.ts`
- Uses existing `Card`, `CardContent`, `CardHeader`, `CardTitle` from `@/components/ui/card`
- Uses existing `StatusBadge` for contract status (draft/active/complete/closed)
- Uses `formatCurrency` from `@/lib/utils` for all money values
- Uses `format` from `date-fns` for date_signed display
- Icons from `lucide-react`: `FileText`, `DollarSign`, `Plus`, `Minus`, `Calendar`, `User`
- Four financial cards in a responsive grid: `grid-cols-2 sm:grid-cols-4`
- Current Value card gets `bg-primary/10` highlight treatment matching the StatCard pattern in `ProjectFinancialSummary`
- Glass card styling: `className="glass border-border"` matching all other Job Hub cards

## What Does NOT Change

- No database changes
- No hook changes
- No modifications to existing components
- Component is created but not wired into any tab yet (that happens in Step 7)

