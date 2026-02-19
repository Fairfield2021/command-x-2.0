
# Step 6: QuickBooks Integration Hardening

## Summary

Standardize all QuickBooks mapping tables, create an idempotent sync queue, eliminate silent entity creation in QuickBooks, and establish immutable structured logging for all sync operations.

## Current State

### Existing Mapping Tables (8 total)
All 8 entity types have mapping tables, but schemas are inconsistent:

| Table | Has `sync_direction`? | Has `error_message`? | Has `updated_at`? | Notes |
|-------|----------------------|---------------------|-------------------|-------|
| `quickbooks_vendor_mappings` | YES | NO | YES | Most complete |
| `quickbooks_customer_mappings` | NO | NO | YES | Missing fields |
| `quickbooks_invoice_mappings` | NO | NO | YES | Uses `synced_at` instead of `last_synced_at` |
| `quickbooks_bill_mappings` | NO | YES | YES | Has `quickbooks_doc_number` |
| `quickbooks_estimate_mappings` | NO | NO | YES | Minimal |
| `quickbooks_po_mappings` | NO | NO | YES | Minimal |
| `quickbooks_account_mappings` | NO | NO | YES | Has QB account metadata |
| `quickbooks_product_mappings` | NO | NO | YES | Has `quickbooks_item_type` |

### Silent Entity Creation Problem
6 edge functions silently create vendors/customers in QuickBooks:
- `quickbooks-create-bill` -- calls `getOrCreateQBVendor()` which creates vendors without user confirmation
- `quickbooks-update-bill` -- same `getOrCreateQBVendor()` pattern
- `quickbooks-create-purchase-order` -- same pattern
- `quickbooks-create-invoice` -- calls `quickbooks-sync-customers` with `find-or-create` action
- `quickbooks-update-invoice` -- same `find-or-create` pattern
- `quickbooks-create-estimate` -- same `find-or-create` pattern

### Logging Gap
Two separate logging tables exist with different schemas:
- `quickbooks_sync_log` -- entity-level logs (entity_type, entity_id, action, status, details)
- `quickbooks_sync_logs` -- batch-level logs (sync_type, records_synced, details)

Neither captures request/response payloads, HTTP status codes, or is immutable.

## What Will Change

### 1. Database Migration: Standardize Mapping Tables

Add missing columns to existing mapping tables via `ALTER TABLE ADD COLUMN IF NOT EXISTS`:

| Column Added | Tables Receiving It |
|-------------|-------------------|
| `sync_direction TEXT DEFAULT 'export'` | customer, invoice, bill, estimate, po, account, product |
| `error_message TEXT` | vendor, customer, invoice, estimate, po, account, product |

Rename `quickbooks_invoice_mappings.synced_at` to `last_synced_at` (add new column, backfill, keep old for compatibility).

No UNIQUE constraints are added on QB IDs where they don't already exist -- these tables may legitimately have multiple local entities mapped to the same QB entity in edge cases.

### 2. Database Migration: Sync Queue Table

Create `quickbooks_sync_queue`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `entity_type` | TEXT | 'vendor', 'customer', 'invoice', 'bill', 'estimate', 'purchase_order' |
| `entity_id` | UUID | Local entity ID |
| `action` | TEXT | 'create', 'update', 'delete', 'void' |
| `priority` | INTEGER | Default 0 (higher = more urgent) |
| `status` | TEXT | 'pending', 'processing', 'completed', 'failed', 'cancelled' |
| `retry_count` | INTEGER | Default 0 |
| `max_retries` | INTEGER | Default 3 |
| `next_retry_at` | TIMESTAMPTZ | For exponential backoff |
| `scheduled_at` | TIMESTAMPTZ | Default now() |
| `processed_at` | TIMESTAMPTZ | When completed |
| `error_message` | TEXT | Last error |
| `created_by` | UUID | Who queued it |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

Deduplication: UNIQUE constraint on `(entity_type, entity_id, action)` WHERE `status IN ('pending', 'processing')` -- prevents duplicate pending items for the same entity/action.

RLS: admin and manager roles can SELECT/INSERT/UPDATE. No DELETE.

### 3. Database Migration: Enhanced Immutable Sync Log

Create `quickbooks_api_log` (new immutable table, keeping existing tables intact):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `function_name` | TEXT | Edge function that made the call |
| `entity_type` | TEXT | What was being synced |
| `entity_id` | UUID | Local entity ID |
| `quickbooks_entity_id` | TEXT | QB entity ID (if known) |
| `http_method` | TEXT | GET, POST, PUT |
| `endpoint` | TEXT | QB API endpoint path |
| `http_status` | INTEGER | Response status code |
| `request_payload` | JSONB | Sanitized request body |
| `response_payload` | JSONB | Response body |
| `error_message` | TEXT | Error details |
| `request_sent_at` | TIMESTAMPTZ | When request was sent |
| `response_received_at` | TIMESTAMPTZ | When response came back |
| `initiated_by` | UUID | User who triggered sync |
| `created_at` | TIMESTAMPTZ | Default now() |

RLS: admin and accounting can SELECT. System can INSERT. No UPDATE or DELETE.

Trigger: `BEFORE UPDATE OR DELETE` raises exception -- logs are immutable.

### 4. Shared Logging Utility

Create `supabase/functions/_shared/qbApiLogger.ts`:

A wrapper around the QuickBooks API fetch calls that:
- Records request timestamp before sending
- Records response timestamp after receiving
- Sanitizes sensitive data (access tokens, auth headers) from payloads
- Inserts into `quickbooks_api_log`
- Returns the parsed response

All edge functions will import and use this wrapper instead of raw `qbRequest()` calls.

```text
loggedQBRequest(supabase, {
  functionName: 'quickbooks-create-bill',
  entityType: 'bill',
  entityId: billId,
  method: 'POST',
  endpoint: '/bill?minorversion=65',
  accessToken, realmId, body,
  initiatedBy: userId
}) -> { response, logId }
```

### 5. Edge Function Updates: Ban Silent Entity Creation

Modify 6 edge functions to require pre-existing mappings instead of auto-creating:

**`quickbooks-create-bill` and `quickbooks-update-bill`:**
- Replace `getOrCreateQBVendor()` with `getRequiredQBVendor()` that:
  - Checks `quickbooks_vendor_mappings` for existing mapping
  - If not found, returns error: `"Vendor '[name]' is not mapped to QuickBooks. Please sync this vendor first from the Vendor Management page."`
  - Never creates a vendor in QuickBooks

**`quickbooks-create-purchase-order`:**
- Same change: replace `getOrCreateQBVendor()` with lookup-only

**`quickbooks-create-invoice`, `quickbooks-update-invoice`, `quickbooks-create-estimate`:**
- Replace `find-or-create` customer sync calls with mapping lookup
- If no mapping exists, return error: `"Customer '[name]' is not mapped to QuickBooks. Please sync this customer first from the Customer Management page."`

**`quickbooks-sync-customers` `find-or-create` action:**
- Keep it but rename to `find-only` -- returns mapping if exists, error if not
- The existing `export` action (which does create customers) remains as the explicit user-initiated flow

### 6. Integrate Shared Logger

Update all QuickBooks edge functions to use `loggedQBRequest()` instead of raw `qbRequest()`. This affects approximately 20 edge functions that make QuickBooks API calls.

## Files Created

| File | Purpose |
|------|---------|
| Migration SQL | Standardize mappings, create sync queue, create API log |
| `supabase/functions/_shared/qbApiLogger.ts` | Shared logging wrapper for QB API calls |

## Files Modified

| File | Change |
|------|--------|
| `quickbooks-create-bill/index.ts` | Replace `getOrCreateQBVendor` with lookup-only + use logger |
| `quickbooks-update-bill/index.ts` | Same |
| `quickbooks-create-purchase-order/index.ts` | Same |
| `quickbooks-create-invoice/index.ts` | Replace `find-or-create` with lookup-only + use logger |
| `quickbooks-update-invoice/index.ts` | Same |
| `quickbooks-create-estimate/index.ts` | Same |
| `quickbooks-sync-customers/index.ts` | Rename `find-or-create` to `find-only`, use logger |
| `quickbooks-sync-vendors/index.ts` | Use logger |
| `quickbooks-sync-products/index.ts` | Use logger |
| `quickbooks-sync-accounts/index.ts` | Use logger |

## What Will NOT Change

- Existing `quickbooks_sync_log` and `quickbooks_sync_logs` tables (preserved for backward compat; new detailed logging goes to `quickbooks_api_log`)
- The explicit `export` and `import` actions in sync functions (these are user-initiated bulk operations)
- QuickBooks OAuth flow
- QuickBooks webhook handler
- The subledger tables (Step 4)
- No frontend changes in this step

## Risk Assessment

- **Medium risk**: Removing silent entity creation is a behavioral change. Users who previously relied on automatic vendor/customer creation during bill/invoice sync will now see an error asking them to sync the entity first. This is the correct behavior per the core rules ("No silent vendor/customer creation").
- **Mitigation**: Error messages clearly indicate what action the user needs to take.
- **Low risk**: Schema additions are non-destructive `ADD COLUMN IF NOT EXISTS`.
- **No data loss**: Existing mapping data is preserved. New columns get sensible defaults.

## Technical Details

### Deduplication Constraint (Sync Queue)

```text
CREATE UNIQUE INDEX idx_qb_sync_queue_dedup
ON quickbooks_sync_queue (entity_type, entity_id, action)
WHERE status IN ('pending', 'processing');
```

This ensures only one pending/processing item exists per entity+action combination. Completed/failed items don't block new entries.

### Silent Creation Replacement Pattern

```text
-- BEFORE (silent creation):
async function getOrCreateQBVendor(supabase, vendorId, accessToken, realmId):
  mapping = lookup mapping
  if mapping exists -> return QB ID
  search QB by name -> if found, create mapping, return QB ID
  create vendor in QB -> create mapping, return QB ID   // <-- BANNED

-- AFTER (lookup only):
async function getRequiredQBVendor(supabase, vendorId):
  mapping = lookup mapping
  if mapping exists -> return QB ID
  vendor = get vendor name
  throw Error("Vendor 'X' is not mapped to QuickBooks...")
```

### Logger Sanitization

The shared logger strips these from payloads before storing:
- `Authorization` headers
- `access_token` values
- `refresh_token` values
- Full SSN/tax ID values (replaced with masked versions)
