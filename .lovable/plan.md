

# SovTable Warnings — Committed Thresholds, No-PO Lock, Overbill Alert

## What Changes

Enhance each SOV table row with inline visual warnings based on financial thresholds:

### 1. Committed % warnings (Committed cell)
- **80–99% committed**: Amber background tint on the Committed cell + small `AlertTriangle` icon
- **≥100% committed**: Red background tint + `AlertTriangle` icon in red

Calculation: `committedPct = (committed_cost / total_value) * 100`

### 2. "No PO" lock icon (new indicator in the # column)
- If `committed_cost === 0` and `total_value > 0`, show a small `Lock` icon (muted) with a tooltip "No PO linked"
- Signals the line has contract value but no procurement commitment yet

### 3. Overbill alert (Invoiced cell)
- If `invoiced_to_date > total_value`, show red background tint + `AlertTriangle` icon on the Invoiced cell
- Additional: if `balance_remaining < 0`, render Balance in red with `text-destructive`

### File: `src/components/project-hub/contract/SovTable.tsx`

**Implementation details:**
- Add imports: `AlertTriangle`, `Lock` from lucide-react; `Tooltip` components from radix
- Per-row computed values via inline logic (no useMemo needed per row — these are simple comparisons):
  - `committedPct = totalValue > 0 ? (committed_cost / totalValue) * 100 : 0`
  - `isNoPO = committed_cost === 0 && totalValue > 0`
  - `isOverbilled = invoiced_to_date > totalValue`
- Modify the `#` column cell: append `Lock` icon when `isNoPO`
- Modify the Committed cell: add conditional `bg-amber-500/10` or `bg-red-500/10` wrapper + icon
- Modify the Invoiced cell: add conditional `bg-red-500/10` + icon when overbilled
- Modify the Balance cell: use `text-destructive` when `balance_remaining < 0`

No new files. No database changes. Single file edit to `SovTable.tsx`.

