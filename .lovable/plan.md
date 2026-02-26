

# Step 7 of 8 — Wire Contract Tab into Job Hub

## What Changes

### 1. New File: `src/components/project-hub/tabs/JobHubContractTab.tsx`

Tab component that:
- Uses `useContractsByProject(projectId)` and `useSovLines(contractId)` to fetch data
- **No contract state**: Empty state with "No contract yet" message, `ConvertEstimateToContract` component, and a "Create Blank Contract" button (calls `useAddContract` with minimal fields)
- **Contract exists state**: Renders `ContractHeader`, `ContractActions`, `SovTable`, and `ConvertEstimateToContract` at the bottom for future addendums

Props: `projectId`, `projectEstimates`, `projectName`

### 2. Modified File: `src/pages/ProjectDetail.tsx`

Minimal changes:
- Add `"contract"` to `VALID_TABS` array (after `"overview"`, before `"financials"`)
- Import `JobHubContractTab` and `Briefcase` icon (or `ScrollText`)
- Add `TabsTrigger` for "Contract" between Overview and Financials
- Add `TabsContent` rendering `JobHubContractTab` with `projectId={id!}`, `projectEstimates={projectEstimates}`, `projectName={project.name}`

### Verification Checklist (from Notion)
- New "Contract" tab appears between Overview and Financials
- Empty state shows when no contract exists
- Contract header and SOV table show when contract exists
- "Add SOV Line" works (handled by SovTable internally)
- URL hash `#contract` works
- All existing tabs still function

