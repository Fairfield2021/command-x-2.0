

# Step 5: Financial Reporting Repair

## Summary

Refactor the project financial summary to clearly separate three financial metrics (Contract Value, Recognized Revenue, Actual Cost), add an accounting cutover date to `company_settings`, and label legacy vs. current data in the UI.

## Current State

- `ProjectFinancialSummary.tsx` mixes contract value, invoicing, and costs into a single flat view with no data-source labeling
- `ProjectDetail.tsx` calculates `financialData` in a single `useMemo` block pulling from operational tables (job orders, change orders, T&M tickets, POs, invoices, vendor bills, time entries, personnel payments)
- `company_settings` has `locked_period_date` and `locked_period_enabled` but NO `accounting_cutover_date` column
- The subledger (`accounting_transactions` / `accounting_lines`) exists but is not queried by any reporting component
- No distinction between pre-cutover (legacy/QuickBooks) and post-cutover (CommandX subledger) data

## What Will Change

### 1. Database Migration

Add `accounting_cutover_date` column to `company_settings`:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `accounting_cutover_date` | DATE | NULL | Transactions before this date are "legacy" |

This is separate from `locked_period_date` (which blocks edits). The cutover date controls data source labeling only.

### 2. New Hook: `useAccountingCutover`

A small hook that reads `company_settings.accounting_cutover_date` and provides:
- `cutoverDate: string | null`
- `isLegacy(date: string): boolean` -- returns true if the date is before the cutover
- `hasCutover: boolean` -- whether a cutover date is configured

File: `src/hooks/useAccountingCutover.ts`

### 3. New Hook: `useProjectSubledgerTotals`

Queries `accounting_transactions` + `accounting_lines` for a given project to get subledger-sourced totals:
- Recognized revenue (posted invoices in subledger)
- Actual costs (posted bills, payroll entries in subledger)

Only returns data for post-cutover transactions. Falls back gracefully (returns zeros) if no subledger entries exist yet.

File: `src/integrations/supabase/hooks/useProjectSubledgerTotals.ts`

### 4. Refactored `ProjectFinancialSummary.tsx`

Restructure into three clearly labeled sections:

**Section 1: Contract / Forecast Value**
- Original Contract (job orders total)
- Change Orders (net additive/deductive)
- T&M Tickets (approved)
- Total Contract Value

**Section 2: Recognized Revenue**
- Total Invoiced (from operational tables or subledger post-cutover)
- Total Paid
- Invoicing Progress bar
- Payment Collection bar
- If pre-cutover data exists, show a "Legacy" badge

**Section 3: Actual Costs**
- WO / Sub Costs (PO commitments)
- Internal Labor (time entries + personnel payments)
- Vendor Payments progress bar
- Total Costs
- If pre-cutover data exists, show a "Legacy" badge

**Section 4: Profitability (derived)**
- Net Profit = Contract Value - Actual Costs
- Margin %
- Supervision cost impact (unchanged)

**Data Source Indicator:**
- When a cutover date is configured, each section shows a small badge:
  - "CommandX" (blue) for post-cutover data
  - "Legacy" (amber) for pre-cutover data
  - "Mixed" (gray) when both exist

### 5. Updated `FinancialData` Interface

Add new fields to support the three-metric separation:

```text
// New fields added:
recognizedRevenue: number       // Invoiced amount (subledger-sourced post-cutover)
committedCosts: number          // PO commitments
actualCosts: number             // Vendor bills paid + labor
dataSource: 'legacy' | 'current' | 'mixed'
```

Existing fields are preserved for backward compatibility.

### 6. Updated `ProjectDetail.tsx` Financial Calculation

The `financialData` useMemo will:
- Check the cutover date from the new hook
- For post-cutover projects: query subledger totals via `useProjectSubledgerTotals`
- For pre-cutover projects: continue using operational tables (as today)
- Set `dataSource` flag based on project dates vs. cutover date
- Pass the enhanced data to `ProjectFinancialSummary`

### 7. Company Settings UI Update

Add the cutover date field to `CompanySettingsForm.tsx` in the accounting section, near the existing locked period controls. Admin-only, with a warning that changing it affects all financial reports.

## Files Created

| File | Purpose |
|------|---------|
| Migration SQL | Add `accounting_cutover_date` to `company_settings` |
| `src/hooks/useAccountingCutover.ts` | Cutover date hook |
| `src/integrations/supabase/hooks/useProjectSubledgerTotals.ts` | Subledger totals query |

## Files Modified

| File | Change |
|------|--------|
| `src/components/project-hub/ProjectFinancialSummary.tsx` | Restructure into 3 sections + data source badges |
| `src/pages/ProjectDetail.tsx` | Add cutover/subledger hooks, enhance `financialData` calculation |
| `src/components/settings/CompanySettingsForm.tsx` | Add cutover date input field |

## What Will NOT Change

- The subledger tables themselves (created in Step 4)
- The locked period mechanism (Step 3)
- Edge functions or QuickBooks sync logic
- Any other pages or components

## Risk Assessment

- **Low risk**: The cutover date is optional (NULL by default). Without it, everything behaves exactly as today -- all data shows as "current" with no legacy labels.
- **No data loss**: This is additive -- existing calculations are preserved, just reorganized visually.
- **Graceful fallback**: If no subledger entries exist yet, the component falls back to operational table data with no errors.

## Technical Details

### Subledger Query (useProjectSubledgerTotals)

```text
SELECT 
  SUM(CASE WHEN at.transaction_type = 'invoice' THEN al.debit_amount ELSE 0 END) as recognized_revenue,
  SUM(CASE WHEN at.transaction_type IN ('bill','payroll') THEN al.debit_amount ELSE 0 END) as actual_costs
FROM accounting_lines al
JOIN accounting_transactions at ON al.transaction_id = at.id
WHERE al.project_id = $projectId
  AND at.status = 'posted'
  AND at.transaction_date >= $cutoverDate
```

### Data Source Logic

```text
IF no cutover date configured -> dataSource = 'current' (no labels shown)
IF project created_at >= cutover date -> dataSource = 'current'  
IF project created_at < cutover date AND has post-cutover transactions -> dataSource = 'mixed'
IF project created_at < cutover date AND no post-cutover transactions -> dataSource = 'legacy'
```

