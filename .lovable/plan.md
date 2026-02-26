

# Phase 6A — Step 6 of 8: ContractActions Component

## New File

**`src/components/project-hub/contract/ContractActions.tsx`**

## Component Structure

```text
ContractActions
├── Status Transition Buttons:
│   ├── Draft → Active ("Activate Contract" button, requires date_signed)
│   ├── Active → Complete ("Mark Complete" button)
│   └── Any → Closed ("Close Contract" button, destructive)
├── Edit Contract Dialog:
│   └── Form: title, contract_number, scope_of_work, date_signed, original_value
└── Delete Contract:
    └── AlertDialog confirmation (only for draft contracts)
```

## Props

| Prop | Type | Source |
|------|------|--------|
| contract | `Contract` | From `useContract` |
| onContractDeleted | `() => void` | Callback to navigate away after delete |

## Implementation Details

- Uses `useUpdateContract` for status transitions and edits
- Uses `useDeleteContract` for removal (draft only)
- Status transition logic:
  - `draft` → `active`: Validates `date_signed` is set; if missing, prompts via toast
  - `active` → `complete`: Direct status update
  - Any → `closed`: AlertDialog confirmation first
- Edit Dialog uses `Dialog` with form fields: `title`, `contract_number`, `scope_of_work`, `date_signed` (Input type="date"), `original_value` (Input type="number")
- Delete only available when `status === "draft"` — AlertDialog confirmation
- Buttons rendered as a horizontal toolbar with appropriate variants: `default` for activate, `outline` for edit, `destructive` for close/delete
- Icons: `CheckCircle2`, `XCircle`, `Pencil`, `Trash2`, `ShieldCheck` from lucide-react
- Audit logging handled automatically by existing `useUpdateContract` and `useDeleteContract` hooks

## What Does NOT Change

- No database changes
- No hook changes
- No modifications to existing components
- Component is created but not wired into any tab yet (Step 7)

