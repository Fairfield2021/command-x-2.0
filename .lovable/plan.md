

# Finish Phase 2 — Delete 7 Remaining Backend Edge Functions

## What's Left
The frontend cleanup (page deletions, route removals, button/link cleanup) is already done. The only remaining Phase 2 work is deleting these 7 legacy edge functions that handled local-to-QBO document creation and updates:

| Function | Purpose (now obsolete) |
|---|---|
| `quickbooks-create-invoice` | Created invoices in QBO from local form |
| `quickbooks-create-estimate` | Created estimates in QBO from local form |
| `quickbooks-create-purchase-order` | Created POs in QBO from local form |
| `quickbooks-create-bill` | Created bills in QBO from local form |
| `quickbooks-update-invoice` | Updated invoices in QBO from local edit form |
| `quickbooks-update-estimate` | Updated estimates in QBO from local edit form |
| `quickbooks-update-bill` | Updated bills in QBO from local edit form |

## What Is NOT Being Removed
- `quickbooks-update-vendor` — handles vendor sync, not document editing
- `quickbooks-void-*` functions — retained for operational voiding
- All `quickbooks-sync-*`, `quickbooks-import-*`, `quickbooks-receive-*` functions — retained for sync/webhook operations

## Steps
1. Delete all 7 edge function directories from `supabase/functions/`
2. Remove the deployed functions from the backend
3. Update the Notion tracker to mark Phase 2 as complete

## Risk
None — the frontend routes and buttons that called these functions were already removed in the previous step. No remaining code references these functions.

