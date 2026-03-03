

# Job Cost Report Implementation

## Create `src/components/reports/JobCostReport.tsx`

- Uses `useAllJobCostSummaries()` hook to fetch all project financial summaries
- **Status filter**: Select dropdown (All / Active / Complete / Closed) filtering by `contract_status`
- **4 KPI summary cards** aggregating filtered data: Total Contract Value, Total Expenses (red), Total Invoiced (teal), Total Gross Profit (green/red)
- **Sortable table** with columns: Project Name, Contract Value, Committed, Expenses, Invoiced, Remaining, Profit, Margin %, % Complete
  - Local sort state (`sortKey` + `sortDirection`), toggle on header click
  - Default: alphabetical by project name
  - Profit: green/red text; Margin: green (>20%), amber (10-20%), red (<10%); % Complete: small Progress bar
  - Row click navigates to `/projects/:id#financials` via `useNavigate`
- **Footer row** with totals for all numeric columns, weighted avg for margin/completion
- **Export CSV** button generating a Blob download
- Loading/empty states

## Modify `src/pages/ReportsPage.tsx`

- Import `JobCostReport`
- Replace the catch-all "Coming soon" block: render `<JobCostReport />` when `activeReport === "job-cost"`, keep "Coming soon" for the remaining 3 reports

