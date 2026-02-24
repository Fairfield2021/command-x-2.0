

# Phase 6A — Step 1 of 8: Create `contracts` Table Migration

## What This Step Does

Creates the `contracts` table — the foundation of the SOV system. This is a new table with no impact on existing code or data.

## Schema

| Column | Type | Details |
|--------|------|---------|
| id | UUID | PK, `gen_random_uuid()` |
| project_id | UUID | FK → projects.id, nullable |
| customer_id | UUID | FK → customers.id, nullable |
| qb_estimate_id | TEXT | nullable, QB estimate reference |
| contract_number | TEXT | nullable, e.g. "CX-2026-001" |
| title | TEXT | NOT NULL |
| status | TEXT | default 'draft' (draft/active/complete/closed) |
| original_value | NUMERIC | default 0 |
| addendum_value | NUMERIC | default 0 |
| deduction_value | NUMERIC | default 0 |
| current_value | NUMERIC | **GENERATED** = original + addendum - deduction |
| scope_of_work | TEXT | nullable |
| date_signed | DATE | nullable |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

## Indexes
- `idx_contracts_project_id` on project_id
- `idx_contracts_customer_id` on customer_id

## RLS Policies (matching projects table pattern)
- **Admin/Manager/Accounting**: Full ALL access
- **Users**: SELECT on assigned projects only (via `is_assigned_to_project`)
- **Personnel**: SELECT on assigned projects (via `personnel_project_assignments`)
- **Vendors**: SELECT on projects linked via their POs

## What Does NOT Change
- No existing tables modified
- No code changes in this step
- Purely additive schema migration

