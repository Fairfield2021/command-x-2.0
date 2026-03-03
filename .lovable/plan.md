

# Owner Dashboard Financial Overview

## What to build

Add a `FinancialOverview` component rendered inside `RowBasedDashboard.tsx` between the KPIBar and QuickActionsRow. It queries `portfolio_summary` and `useAllJobCostSummaries()`, and renders only when there are active contracts.

## Component: `src/components/dashboard/rows/FinancialOverview.tsx`

### Data
- `portfolio_summary` view via `useQuery` + supabase client (`.single()`)
- `useAllJobCostSummaries()` for the project profitability table

### Guard
If portfolio data is null or `active_projects === 0`, render nothing.

### Section header
"Financial Overview" label with a "View Reports →" link to `/reports`

### 6 KPI cards (grid: 3 cols desktop, 2 mobile)
Using existing `StatCard` component:
1. Active Projects — `active_projects`, Briefcase icon
2. Total Contract Value — `total_contract_value`, FileText icon
3. Commitment Exposure — `total_open_commitments`, Clock icon, amber text, subtitle
4. Accounts Payable — `total_ap`, FileWarning icon, purple text, subtitle
5. Total Invoiced — `total_invoiced`, Send icon, teal text
6. Portfolio Profit — `total_gross_profit`, TrendingUp icon, green/red + margin badge

### Project Profitability table
- Filter `useAllJobCostSummaries` for `contract_status === 'active'`
- Sort by `margin_percent` ascending (worst first)
- Limit to 10 rows
- Columns: Project, Contract Value, Expenses, Invoiced, Profit (green/red), Margin (color-coded), Completion (Progress bar)
- Row click → `/projects/:id#financials`
- "View All →" link to `/reports`

## Modify: `src/components/dashboard/rows/RowBasedDashboard.tsx`
- Import `FinancialOverview`
- Render `<FinancialOverview />` between KPIBar and QuickActionsRow (around line 235-237)

## Files
- **Create**: `src/components/dashboard/rows/FinancialOverview.tsx`
- **Modify**: `src/components/dashboard/rows/RowBasedDashboard.tsx` (one import + one JSX line)

