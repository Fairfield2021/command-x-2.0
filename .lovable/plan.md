

# Step 3: Accounting Period Guardrails

## Current State

- **`company_settings`** has `locked_period_date` (DATE) and `locked_period_enabled` (BOOLEAN) -- already functional
- **`locked_period_violations`** table exists with RLS enabled (admin-only SELECT, open INSERT for logging)
- **`validateLockedPeriod()`** server-side function exists and is used by 6 edge functions (create/update for invoice, estimate, bill)
- **`useLockedPeriod`** client-side hook exists but is only used in `VendorBillForm.tsx`
- **No `accounting_periods` table** exists yet
- **Critical flaw**: The validator **fails open** -- if settings can't be read, transactions are allowed through

## What Will Change

### 1. Database Migration

**New table: `accounting_periods`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `period_name` | TEXT | e.g., "January 2025" |
| `start_date` | DATE | Period start |
| `end_date` | DATE | Period end |
| `is_locked` | BOOLEAN | Default false |
| `locked_at` | TIMESTAMPTZ | When locked |
| `locked_by` | UUID | References auth.users |
| `fiscal_year` | INTEGER | For reporting |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

RLS policies:
- SELECT: admin, manager, accounting roles can view
- INSERT/UPDATE/DELETE: admin only

**New table: `accounting_period_audit_log`**

Tracks lock/unlock actions for audit trail.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `period_id` | UUID | References accounting_periods |
| `action` | TEXT | 'lock' or 'unlock' |
| `performed_by` | UUID | References auth.users |
| `performed_at` | TIMESTAMPTZ | Default now() |
| `details` | JSONB | Additional context |

RLS: admin-only SELECT, open INSERT for system logging.

**New trigger function: `validate_transaction_date_not_locked()`**

A `BEFORE INSERT OR UPDATE` trigger on financial tables (`invoices`, `estimates`, `vendor_bills`, `purchase_orders`, `change_orders`) that:
- Checks if the transaction date falls within any locked `accounting_periods` row
- Checks if the date is on or before `company_settings.locked_period_date`
- Raises an exception if either check fails (fail-closed)
- Logs the violation to `locked_period_violations`

### 2. Server-Side Validator: Fail-Closed

Update `supabase/functions/_shared/lockedPeriodValidator.ts`:

- **Change fail-open to fail-closed**: If `company_settings` cannot be read, return `{ allowed: false }` with a message explaining the system cannot verify period status
- **Add `accounting_periods` check**: Query for any locked period where the transaction date falls between `start_date` and `end_date`
- **Return the specific locked period name** in the error message for clarity
- All 6 existing edge function callers automatically get the enhanced validation with no changes needed

### 3. Client-Side Hook Enhancement

Update `src/hooks/useLockedPeriod.ts`:

- Fetch `accounting_periods` (locked ones) alongside `company_settings`
- `isDateLocked()` checks both the global cutoff date AND whether the date falls in any locked accounting period
- `validateDate()` returns which specific period is locked in the error message
- `minAllowedDate` remains based on `company_settings.locked_period_date` (global cutoff)

### 4. UI Integration

Integrate `useLockedPeriod` into financial forms that currently lack it:

| Form Component | Currently Uses Hook? |
|---------------|---------------------|
| `VendorBillForm.tsx` | Yes |
| `EstimateForm.tsx` | No -- will add |
| Invoice creation (in `useProjectInvoice.ts`) | No -- will add |
| Purchase order forms | No -- will add |
| Change order forms | No -- will add |

For each form:
- Disable date picker for locked dates using `minAllowedDate` and `isDateLocked`
- Show validation error if a locked date is submitted
- Add visual warning text near date fields when locked periods are active

### 5. Admin Period Management

No new pages are created in this step. The `accounting_periods` table will be manageable through the existing company settings area. The data structure is in place for a future admin UI.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/_shared/lockedPeriodValidator.ts` | Fail-closed + accounting_periods check |
| `src/hooks/useLockedPeriod.ts` | Add accounting_periods query + enhanced validation |
| `src/components/estimates/EstimateForm.tsx` | Add useLockedPeriod integration |
| `src/integrations/supabase/hooks/useProjectInvoice.ts` | Add locked period validation before insert |

## Files Created

| File | Purpose |
|------|---------|
| Migration SQL | accounting_periods table, audit log, trigger function |

## What Will NOT Change

- The 6 edge functions that call `validateLockedPeriod()` -- they get enhanced validation automatically through the shared module
- The `locked_period_violations` table structure (already correct)
- The `company_settings` table (existing `locked_period_date` and `locked_period_enabled` columns are preserved)
- The `VendorBillForm.tsx` integration (already works, just gets enhanced behavior from the updated hook)

## Risk Assessment

- **Low risk**: New table + trigger additions are non-destructive
- **Medium risk**: Fail-closed change means if the database is unreachable, financial edge functions will block rather than allow. This is the correct behavior for accounting integrity per the system's core rules ("Never fail open if settings cannot be read")
- **Mitigation**: The trigger function uses `EXCEPTION` which rolls back the transaction cleanly, so no partial writes occur

## Technical Details

### Trigger Function Logic (Pseudocode)

```text
BEFORE INSERT OR UPDATE on financial tables:
  1. Check company_settings.locked_period_enabled
  2. If enabled AND txn_date <= locked_period_date -> RAISE EXCEPTION
  3. Check accounting_periods for any row where is_locked = true
     AND txn_date BETWEEN start_date AND end_date -> RAISE EXCEPTION
  4. Log violation to locked_period_violations
  5. Otherwise allow
```

### Edge Function Validator Changes

```text
validateLockedPeriod():
  IF cannot read company_settings -> return { allowed: false }  // FAIL CLOSED
  IF locked_period_enabled AND txn_date <= locked_period_date -> block
  IF any accounting_period is locked AND txn_date in range -> block
  OTHERWISE -> allow
```

