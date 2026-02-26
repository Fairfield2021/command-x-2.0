

# Update SovTable: Invoiced Column, Color Coding, Progress Bar, CO Badge, Mobile Responsive

## Changes to `src/components/project-hub/contract/SovTable.tsx`

### 1. Import Progress component
Add `import { Progress } from "@/components/ui/progress";`

### 2. Totals calculation
Add `invoiced_to_date` accumulator to the `useMemo` reduce.

### 3. Table Header (responsive + new Invoiced column)
- Qty, Unit, Unit Price, Markup%: add `hidden md:table-cell`
- Committed, Actual, Billed, Paid: add `hidden md:table-cell`
- Add "Invoiced" header after "Paid" (always visible)
- Balance, % Comp, Actions: always visible

### 4. Table Body rows
- **Line #**: Show `Badge` with "CO" (variant `default`, blue) next to number when `is_addendum`
- **Qty, Unit, Unit Price, Markup%**: add `hidden md:table-cell`
- **Committed**: amber text + `hidden md:table-cell`
- **Actual**: `hidden md:table-cell` (default color)
- **Billed**: purple text + `hidden md:table-cell`
- **Paid**: red text + `hidden md:table-cell`
- **Invoiced** (new): teal text, always visible
- **Balance**: `font-semibold`
- **% Complete**: Replace text with Progress bar + small percentage label. Color: green <80%, amber 80-99%, red >=100%

### 5. Table Footer
- Adjust `colSpan` for hidden columns: `colSpan={2}` on mobile (Line# + Description), `colSpan={6}` on md+
- Add Invoiced total after Paid total
- Apply matching color classes to footer financial cells
- Hidden columns in footer get `hidden md:table-cell`

### 6. Empty row
- Adjust `colSpan` from 14 to 15

### Progress bar color implementation
```tsx
const progressColor = line.percent_complete >= 100 
  ? "[&>div]:bg-destructive" 
  : line.percent_complete >= 80 
    ? "[&>div]:bg-amber-500" 
    : "[&>div]:bg-green-500";
```

