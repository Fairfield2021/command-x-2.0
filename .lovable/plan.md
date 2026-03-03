

# Reports Page + SOV Status Report

## Files to Create/Modify

### 1. Create `src/pages/ReportsPage.tsx`
- Page header: "Reports" / "Financial reports across all projects"
- Grid of 5 report cards (SOV Status, Job Cost, Commitments, AP Aging, Change Orders) with icons, titles, descriptions
- `activeReport` state toggles which report renders below the grid
- Only SOV Status is implemented now; others show "Coming soon" placeholder
- Visual style matches dashboard cards

### 2. Create `src/components/reports/SovStatusReport.tsx`
- **Project selector**: Popover + Command listing all projects that have contracts. Uses `useProjects` to get all projects, `useContracts` to find which have contracts, then filters
- **Data fetching**: `useContractsByProject(selectedProjectId)` → get first contract → `useSovLines(contractId)`
- **Summary header**: 5 KPI cards — Contract Value, Total Committed, Total Invoiced, Balance Remaining, Avg % Complete (computed from SOV lines)
- **Table**: Line #, Description, Total Value, Committed, Expenses, Invoiced, Remaining, % Complete — with color coding (amber committed, green expenses, teal invoiced)
- **Footer row**: Column totals
- **Export CSV**: Button that builds CSV from visible data and triggers download via Blob/URL
- **Empty state**: "Select a project to view its SOV status"

### 3. Modify `src/App.tsx`
- Add `import Reports from "./pages/ReportsPage"`
- Add `<Route path="/reports" element={<Reports />} />` in the SidebarLayout group (after `/overhead-analysis`)

### 4. Modify `src/components/layout/navigation/AppNavigationSidebar.tsx`
- Add `{ title: "Reports", url: "/reports", icon: BarChart3 }` to the Workspace section items, after "Documents"

### Technical Notes
- `useContracts()` fetches all contracts to determine which projects have contracts for the selector
- SOV line fields map directly: `total_value`, `committed_cost`, `actual_cost` (expenses), `invoiced_to_date`, `balance_remaining`, `percent_complete`
- CSV export: iterate SOV lines, join with commas, create `text/csv` Blob, trigger download via anchor click

