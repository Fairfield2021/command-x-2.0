

# Job Cost Breakdown Chart

## New File: `src/components/project-hub/contract/JobCostChart.tsx`

**Props:** `{ summary: JobCostSummary | null }`

Returns `null` if summary is null.

### Chart Structure
Horizontal stacked bar chart (Recharts `BarChart` with `layout="vertical"`), max height 200px, two bars:

**Bar 1 — "Costs":**
- Expenses (`total_expenses`) — green `#16a34a`
- Open Commitments (`open_commitments`) — amber `#d97706`
- Unbilled AP (`total_billed - total_expenses`) — purple `#9333ea`

**Bar 2 — "Revenue":**
- Collected (`total_invoiced`) — teal `#0d9488`
- Remaining (`total_remaining`) — gray `#6b7280`

Both bars scaled to `total_contract_value` as the X-axis domain max.

### Additional Elements
- Custom legend below with color swatches + labels (5 items)
- If `gross_profit < 0`, render a red warning banner: "⚠ This project is currently unprofitable"
- Wrapped in a `Card` component, compact styling

Uses `ChartContainer` + `ChartConfig` from `src/components/ui/chart.tsx` for theming, with `ChartTooltip` for hover details showing formatted currency values.

## Modified: `JobHubFinancialsTab.tsx`

- Import `JobCostChart`
- Place `<JobCostChart summary={summary} />` between the KPI Card and `<ProjectLaborAllocation>` (after line ~192, before line ~194)
- The `summary` variable already exists from the `useJobCostSummary` call

