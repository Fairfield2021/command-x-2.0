

# Replace Financial Summary with Job Cost Summary KPI Cards

## Scope

Only `src/components/project-hub/tabs/JobHubFinancialsTab.tsx` needs modification. `ProjectDetail.tsx` already passes `projectId` — no changes needed there.

## Changes to `JobHubFinancialsTab.tsx`

### 1. Replace the old `<ProjectFinancialSummary>` call (line 96) with a new inline KPI section

- Import `useJobCostSummary` from `@/hooks/useJobCostSummary`
- Import additional icons: `Clock`, `FileWarning`, `DollarSign`, `Send`, `Wallet`, `TrendingUp`
- Import `Badge` from `@/components/ui/badge` and `Progress` from `@/components/ui/progress`
- Import `formatCurrency` from `@/lib/utils`
- Remove the `ProjectFinancialSummary` import and the `financialData` prop (no longer needed)

### 2. New KPI Section Structure

Call `useJobCostSummary(projectId)` inside the component. Render a `Card` with:

**Row 1 — Contract & Commitments (4-col grid):**
- Contract Value (FileText, neutral)
- Open Commitments (Clock, amber, subtitle)
- Billed AP (FileWarning, purple, subtitle)
- Expenses Paid (DollarSign, red, subtitle)

**Row 2 — Revenue & Profit (3-col grid filling to 4):**
- Invoiced AR (Send, teal, subtitle)
- Remaining (Wallet, default, subtitle)
- Gross Profit (TrendingUp, green/red conditional, margin_percent badge)

**Progress bar** below cards: `avg_percent_complete` with "Overall Completion: X%" label.

**No-contract fallback**: If `contract_id` is null, show $0 values with a muted message.

### 3. Everything below line 97 stays unchanged

The `ProjectLaborAllocation`, estimates table, job orders table, invoices table, vendor bills, change orders, T&M tickets, POs, and time entries all remain as-is.

### Technical Detail

- `financialData` prop can be removed from the interface and the component since the view replaces it, but `ProjectDetail.tsx` still computes it — we'll keep the prop in the interface for backward compatibility and simply not use it, OR remove it cleanly from both files. Given the instruction says "modify only these two files", we'll remove it from the interface and ignore it in ProjectDetail (removing that one prop from the JSX).

