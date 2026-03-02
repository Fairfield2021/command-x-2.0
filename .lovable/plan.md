

# New Hook: `useJobCostSummary.ts`

## What

Create `src/hooks/useJobCostSummary.ts` with two React Query hooks that query the `job_cost_summary` database view.

## Implementation

Single new file following the exact patterns from `useContracts.ts` and `useSovLines.ts`:

- **`useJobCostSummary(projectId)`** — filters by `project_id`, uses `.maybeSingle()`, enabled when `projectId` is truthy
- **`useAllJobCostSummaries()`** — fetches all rows, returns array

Both use `supabase.from("job_cost_summary")` with the provided `JobCostSummary` interface and standard TanStack Query options.

No existing files modified. No database changes.

