

# SovLinePicker Dropdown Component

## What it does
A reusable dropdown that lets users pick an SOV line when creating/editing PO line items, vendor bill line items, or invoice line items. Each option shows the line number, description, and remaining balance. Lines with zero or negative balance are visually disabled.

## Component: `src/components/shared/SovLinePicker.tsx`

**Props:**
- `contractId: string` — fetches SOV lines for this contract
- `value: string | null` — currently selected sov_line_id
- `onChange: (sovLineId: string | null) => void`
- `contextType: "po" | "bill" | "invoice"` — determines which balance column to show (committed vs billed vs invoiced)
- `disabled?: boolean`
- `placeholder?: string`

**Behavior:**
- Uses `useSovLines(contractId)` hook to fetch lines
- Renders a Popover + Command (cmdk) searchable list (consistent with existing shadcn patterns in the project)
- Each item shows: `#{line_number} — {description}` on the left, remaining balance on the right
- Balance calculation per context:
  - `po`: `total_value - committed_cost`
  - `bill`: `total_value - billed_to_date`  
  - `invoice`: `balance_remaining` (already computed as `total_value - invoiced_to_date`)
- Lines where remaining balance <= 0 are shown greyed out with `(Fully Used)` label and are non-selectable
- Includes a "None" option to clear the selection
- Color-codes balance using the existing SOV color convention (amber for committed, purple for billed, teal for invoiced)

**Implementation pattern:** Follows the existing Popover + Command combobox pattern already used in the project's Select/Command primitives. Single file, no database changes.

