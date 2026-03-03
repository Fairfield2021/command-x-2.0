

# AP Aging Report Implementation

## Create `src/components/reports/APAgingReport.tsx`

Follows the exact same structure as the other report components (JobCostReport, CommitmentReport).

### Data
- Query `ap_aging_summary` view via `useQuery` + Supabase client directly
- View columns: `bill_id`, `bill_number`, `vendor_name`, `project_name`, `total_amount`, `amount_paid`, `balance_due`, `payment_status`, `bill_date`, `due_date`, `aging_bucket`, `days_past_due`

### UI Structure
1. **Filter bar**: Aging Bucket (All/Current/1-30/31-60/61-90/90+), Project dropdown, Vendor dropdown + Export CSV button
2. **5 aging bucket KPI cards** in a row — each shows sum of `balance_due` for that bucket with color coding:
   - Current → green, 1-30 → amber, 31-60 → orange, 61-90 → red-orange (via `text-red-500`), 90+ → red
   - Below cards: bold "Total Outstanding: $X"
3. **Stacked bar chart** (Recharts `BarChart` with stacked `Bar` components) — single bar, 5 segments matching bucket colors, max height ~60px
4. **Sortable detail table**: Bill #, Vendor, Project, Bill Date, Due Date, Total, Paid, Balance Due, Days Past Due, Aging (colored badge)
   - Default sort: `days_past_due` descending
5. **Export CSV**: Same Blob pattern

### Color map (reused across cards, chart, badges)
```
current: green-500/600
1-30: amber-500/600
31-60: orange-500/600
61-90: red-400/500
90+: red-600/700
```

## Modify `src/pages/ReportsPage.tsx`
- Import `APAgingReport`
- Replace the "Coming soon" placeholder: render `<APAgingReport />` when `activeReport === "ap-aging"`

