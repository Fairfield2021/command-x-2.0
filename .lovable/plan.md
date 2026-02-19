

# Step 4: Accounting Subledger System

## Summary

Create the foundational double-entry bookkeeping subledger that serves as the authoritative source for all financial data. This system enforces immutability on posted transactions (corrections via reversals only), validates debit/credit balance, and provides QuickBooks sync mapping with a full audit trail.

## Current State

- **No subledger exists** -- financial data lives directly in operational tables (`invoices`, `vendor_bills`, etc.)
- Two QuickBooks sync log tables already exist (`quickbooks_sync_log` and `quickbooks_sync_logs`) but are operational logs, not accounting sync maps
- `expense_categories` exists but lacks account codes needed for a chart of accounts -- the new `accounting_lines` table will store `account_code` and `account_name` denormalized for immutability
- The `accounting_periods` table and locked period triggers from Step 3 are already in place

## What Will Be Created

### 1. `accounting_transactions` table (append-only ledger)

The core transaction header table. Once posted, rows cannot be updated or deleted -- corrections are made via reversal transactions only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `transaction_date` | DATE | Required |
| `transaction_type` | TEXT | 'invoice', 'bill', 'payment', 'journal_entry', 'payroll' |
| `reference_type` | TEXT | 'invoice', 'vendor_bill', 'personnel_payment', etc. |
| `reference_id` | UUID | Source document ID (nullable) |
| `reference_number` | TEXT | Display number (e.g., INV-2500001) |
| `description` | TEXT | Transaction description |
| `total_amount` | NUMERIC | Total transaction amount (absolute) |
| `status` | TEXT | 'draft', 'posted', 'reversed' |
| `posted_at` | TIMESTAMPTZ | When posted |
| `posted_by` | UUID | Who posted |
| `reversed_at` | TIMESTAMPTZ | When reversed |
| `reversed_by` | UUID | Who reversed |
| `reversal_transaction_id` | UUID | Self-reference to reversal |
| `created_at` | TIMESTAMPTZ | Default now() |
| `created_by` | UUID | Creator |

Indexes on: `transaction_date`, `status`, `reference_type + reference_id`, `reversal_transaction_id`.

### 2. `accounting_lines` table (debit/credit entries)

Double-entry line items. Each line is either a debit or a credit, never both.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `transaction_id` | UUID | FK to accounting_transactions (CASCADE) |
| `line_number` | INTEGER | Ordering |
| `account_id` | UUID | FK to expense_categories (nullable) |
| `account_code` | TEXT | Denormalized for immutability |
| `account_name` | TEXT | Denormalized for immutability |
| `debit_amount` | NUMERIC(15,2) | Default 0 |
| `credit_amount` | NUMERIC(15,2) | Default 0 |
| `project_id` | UUID | FK to projects (nullable) |
| `vendor_id` | UUID | FK to vendors (nullable) |
| `customer_id` | UUID | FK to customers (nullable) |
| `description` | TEXT | Line description |
| `created_at` | TIMESTAMPTZ | Default now() |

CHECK constraint: exactly one of debit or credit must be positive, the other zero.

Indexes on: `transaction_id`, `account_id`, `project_id`.

### 3. `accounting_sync_map` table

Maps subledger transactions to QuickBooks entities. Ensures no duplicate syncs via UNIQUE constraints.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `transaction_id` | UUID | FK to accounting_transactions (UNIQUE) |
| `quickbooks_entity_type` | TEXT | 'Invoice', 'Bill', 'Payment', 'JournalEntry' |
| `quickbooks_entity_id` | TEXT | QuickBooks ID (UNIQUE) |
| `sync_status` | TEXT | 'pending', 'synced', 'error' |
| `last_synced_at` | TIMESTAMPTZ | Last sync time |
| `error_message` | TEXT | Last error (nullable) |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

UNIQUE on `transaction_id` (one QB entity per transaction).
UNIQUE on `quickbooks_entity_type + quickbooks_entity_id` (no duplicate QB records).

### 4. `accounting_sync_audit_log` table (immutable)

Every sync attempt is logged for audit trail. Append-only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `sync_map_id` | UUID | FK to accounting_sync_map |
| `sync_direction` | TEXT | 'to_quickbooks', 'from_quickbooks' |
| `sync_status` | TEXT | 'success', 'error' |
| `request_payload` | JSONB | What was sent |
| `response_payload` | JSONB | What was returned |
| `error_message` | TEXT | Error details |
| `synced_at` | TIMESTAMPTZ | Default now() |
| `synced_by` | UUID | Who triggered the sync |

## Database Functions

### `enforce_posted_transaction_immutability()` -- BEFORE UPDATE trigger

Prevents any UPDATE on `accounting_transactions` rows where `status = 'posted'`, EXCEPT:
- Setting `status` from 'posted' to 'reversed' (with `reversed_at`, `reversed_by`, `reversal_transaction_id`)

This enforces the "corrections via reversals only" rule at the database level.

### `validate_transaction_balance()` -- trigger on status change to 'posted'

Before a transaction can be posted, validates that the sum of all `debit_amount` values equals the sum of all `credit_amount` values across its `accounting_lines`. If they don't balance, raises an exception.

### `prevent_posted_lines_modification()` -- BEFORE UPDATE/DELETE trigger on accounting_lines

Prevents modification or deletion of lines belonging to a posted transaction.

## RLS Policies

| Table | Policy | Roles |
|-------|--------|-------|
| `accounting_transactions` | SELECT | admin, manager, accounting |
| `accounting_transactions` | INSERT | admin, accounting |
| `accounting_transactions` | UPDATE (draft only) | admin, accounting |
| `accounting_lines` | SELECT | admin, manager, accounting |
| `accounting_lines` | INSERT | admin, accounting |
| `accounting_sync_map` | SELECT | admin, manager, accounting |
| `accounting_sync_map` | ALL | admin |
| `accounting_sync_audit_log` | SELECT | admin, accounting |
| `accounting_sync_audit_log` | INSERT | admin, accounting (for system logging) |

No DELETE policies on any table -- accounting data is never deleted.

## What Will NOT Change

- Existing operational tables (`invoices`, `vendor_bills`, `purchase_orders`, etc.) remain unchanged
- Existing `quickbooks_sync_log` and `quickbooks_sync_logs` tables are preserved (they serve operational logging)
- No edge functions are modified in this step -- the subledger is schema-only, ready for future integration
- No frontend changes -- admin UI for the subledger will be a future step

## Files Created

| File | Purpose |
|------|---------|
| Migration SQL | All 4 tables, 3 trigger functions, RLS policies, indexes |

## Risk Assessment

- **No risk to existing data**: All new tables, no modifications to existing schema
- **Forward-compatible**: The subledger sits alongside operational tables. Future steps will wire invoice/bill creation to also create subledger entries
- **Immutability enforced at DB level**: Even if application code has bugs, posted transactions cannot be corrupted

## Technical Details

### Immutability Enforcement (Pseudocode)

```text
BEFORE UPDATE on accounting_transactions:
  IF OLD.status = 'posted' THEN
    -- Only allow: status -> 'reversed' with reversal fields
    IF NEW.status = 'reversed' 
       AND NEW.reversed_at IS NOT NULL 
       AND NEW.reversed_by IS NOT NULL
       AND NEW.reversal_transaction_id IS NOT NULL THEN
      ALLOW
    ELSE
      RAISE EXCEPTION 'Posted transactions are immutable'
    END IF
  END IF
```

### Balance Validation (Pseudocode)

```text
BEFORE UPDATE on accounting_transactions (when status changes to 'posted'):
  total_debits = SUM(debit_amount) FROM accounting_lines WHERE transaction_id = NEW.id
  total_credits = SUM(credit_amount) FROM accounting_lines WHERE transaction_id = NEW.id
  IF total_debits != total_credits OR total_debits = 0 THEN
    RAISE EXCEPTION 'Transaction does not balance'
  END IF
```
