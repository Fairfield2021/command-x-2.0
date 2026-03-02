

# Migration: Enhance change_orders table

## Analysis of Existing vs Requested

The table already has several of the requested columns (with slightly different names/types):

| Requested | Already Exists | Notes |
|-----------|---------------|-------|
| `approved_by` | ✅ `approved_by UUID` | Already exists |
| `co_type` | ✅ `change_type` (enum) | Already exists as `change_type` enum ('additive'/'deductive') |
| `approval_status` | ✅ `status` (enum) | Already exists as `change_order_status` enum with values including draft, approved, rejected, etc. |
| `approval_date` | ✅ `approved_at` | Already exists as `approved_at TIMESTAMPTZ` |
| `co_number` | ✅ `number` | Already exists — the `generate_change_order_number` function and `set_change_order_number` trigger already auto-assign `number` as `CO-N` |
| `contract_id` | ❌ Missing | Needs adding |
| `qb_estimate_id` | ❌ Missing | Needs adding |
| `sent_to` | ❌ Missing | Needs adding |
| `co_value` | ❌ Missing | Needs adding (note: `total` already exists but `co_value` may serve a different purpose) |

## What the migration will actually do

Only add the **truly missing** columns and skip duplicates to avoid conflicts:

1. **`contract_id UUID`** — FK to `contracts(id)`, nullable, with index
2. **`qb_estimate_id TEXT`** — QuickBooks estimate reference, nullable
3. **`sent_to TEXT`** — customer/PM name the CO was sent to, nullable
4. **`co_value NUMERIC NOT NULL DEFAULT 0`** — CO amount value

Skip these (already exist under equivalent names):
- `co_number` → already `number` with auto-gen trigger
- `co_type` → already `change_type` enum
- `approval_status` → already `status` enum
- `approval_date` → already `approved_at`
- `approved_by` → already exists

The `generate_co_number` function and trigger will **not** be created since `generate_change_order_number` and `set_change_order_number` trigger already handle this identically.

Index on `project_id` will be added if not present. Index on `contract_id` will be added.

## Migration SQL

```sql
-- Add missing columns
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id);
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS qb_estimate_id TEXT;
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS sent_to TEXT;
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS co_value NUMERIC NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_orders_contract_id ON public.change_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON public.change_orders(project_id);
```

No code files modified. No duplicate functions or triggers created.

