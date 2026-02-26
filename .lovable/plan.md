

# Add Contract Summary to Overview Tab

## File 1: `src/components/project-hub/tabs/JobHubOverviewTab.tsx`

### Changes:
1. **Add imports**: `useContractsByProject` from `useContracts`, `useSovLines` from `useSovLines`, `ClipboardList` from lucide-react, `Progress`, `Badge` (already available), `formatCurrency`
2. **Add `projectId: string` to `JobHubOverviewTabProps`**
3. **Add hooks**: `useContractsByProject(projectId)` and `useSovLines(firstContract?.id)` inside component
4. **Add `useMemo`** to compute SOV totals (committed, invoiced, remaining) and average percent_complete
5. **Render Contract Summary card** between the Progress card and Quick Actions card — only if a contract exists
   - Header: `ClipboardList` icon + "Contract" + `StatusBadge` for contract status
   - Body: 4-column grid of label/value pairs (Contract Value, Committed, Invoiced, Remaining)
   - Thin `Progress` bar for average completion
   - "View Full SOV →" link via `window.location.hash = "contract"`

## File 2: `src/pages/ProjectDetail.tsx`

### Change (line ~341-347):
Add `projectId={id!}` prop to the `<JobHubOverviewTab>` component.

