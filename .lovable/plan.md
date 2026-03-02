

# Add Expenses & Open Commitment Columns to SOV Table

## File: `src/components/project-hub/contract/SovTable.tsx`

### Column Changes

**Header row (lines 179–182):**
- Rename "Committed" → "Total Committed" (keep `hidden md:table-cell`, amber color)
- Insert **"Expenses"** column after it — `text-green-600 dark:text-green-400`, visible on both mobile and desktop
- Insert **"Open"** column after Expenses — `text-amber-600 dark:text-amber-400`, `hidden md:table-cell`
- Remove the old standalone "Actual" and "Paid" columns (replaced by Expenses=paid_to_date; Actual was redundant)

**Body row (lines 234–244):**
- Rename Committed cell to Total Committed (no logic change)
- Add **Expenses** cell: `formatCurrency(line.paid_to_date)`, green text, always visible
- Add **Open** cell: compute `openAmt = line.committed_cost - line.paid_to_date`
  - If 0 → show "—" muted
  - If negative → red text
  - Otherwise → amber text with same warning logic as committed (icon when ≥80% of remaining budget)
  - `hidden md:table-cell`
- Remove old Actual and Paid cells

**Footer row (lines 278–288):**
- Add totals for Expenses (`totals.paid_to_date`, green) and Open (`totals.committed_cost - totals.paid_to_date`, amber)
- Update `colSpan` values to account for new column count (was 15 → now 15 still: removed 2 old, added 2 new)

**Mobile visibility:**
- Mobile shows: `#`, Description, Total Value, **Expenses**, Invoiced, Balance, % Complete, Actions
- Hidden on mobile: Qty, Unit, Unit Price, Markup%, **Total Committed**, **Open**, Billed

**colSpan on empty state** stays at same total column count (15).

### Totals memo
Add `open_commitments` to the totals reducer: `committed_cost - paid_to_date` per line.

