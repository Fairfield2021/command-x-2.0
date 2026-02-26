

# Prompt 6 of 8 — Estimate-to-Contract Conversion UI

## New File

**`src/components/project-hub/contract/ConvertEstimateToContract.tsx`**

## What It Does

Adds a "Convert to Contract" button next to approved estimates (status = `accepted`/`approved`) that don't already have a linked contract. Clicking it opens a confirmation dialog previewing the SOV lines that will be created, then creates the contract + SOV lines in one action.

## Props

| Prop | Type |
|------|------|
| `projectId` | `string` |
| `projectEstimates` | `EstimateWithLineItems[]` (already fetched in Job Hub) |
| `projectName` | `string` |

## Component Flow

```text
ConvertEstimateToContract
├── For each approved estimate without a linked contract:
│   └── "Convert to Contract" Button
└── Dialog (on click):
    ├── Estimate # and Customer Name (read-only)
    ├── SOV Line Preview Table (description, qty, unit_price, markup, total)
    ├── "Contract Title" text input (pre-filled: project name)
    └── "Confirm & Create Contract" button
```

## Implementation Details

1. **Filter logic**: Query `contracts` table for this project to find which `qb_estimate_id` values are already used. Only show the button on approved estimates not yet converted.
2. **On confirm**:
   - Call `useAddContract` to create contract with `project_id`, `customer_id`, `qb_estimate_id` (= estimate.id), `title`, `original_value` (= estimate.total), `status: "draft"`.
   - Call `useBulkCreateSovLines` to create one SOV line per estimate line item, mapping: `description`, `quantity`, `unit_price`, `markup`, `unit` (null), `committed_cost: 0`, `actual_cost: 0`, `billed_to_date: 0`, `paid_to_date: 0`, `invoiced_to_date: 0`, `retention_held: 0`, `percent_complete: 0`, `is_addendum: false`, `sort_order` from line item index.
3. **Toast**: "Contract created with X SOV lines"
4. **No QuickBooks calls** — estimate already exists in QB, this is CX-only.
5. **Invalidates**: `contracts` query cache on success.

## Data Dependencies

- `useContractsByProject(projectId)` — to check which estimates are already converted
- `useAddContract` — from `useContracts.ts`
- `useBulkCreateSovLines` — from `useSovLines.ts`
- Estimate line items already available via `projectEstimates` prop (fetched with line items in Job Hub)

## What Does NOT Change

- No database migrations
- No modifications to existing hooks or components
- Component is created standalone; wiring into the Financials tab happens in Step 7

