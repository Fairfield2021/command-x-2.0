

# Phase 6A — Step 2 of 8: Create `sov_lines` Table Migration ✅

## What This Step Does

Creates the `sov_lines` table — child of contracts, tracking line-level financials for the Schedule of Values.

## Schema

| Column | Type | Details |
|--------|------|---------|
| id | UUID | PK |
| contract_id | UUID | FK → contracts.id, CASCADE delete |
| line_number | INTEGER | NOT NULL |
| description | TEXT | NOT NULL |
| product_id | UUID | FK → products.id, nullable |
| quantity | NUMERIC | default 1 |
| unit | TEXT | default 'EA' |
| unit_price | NUMERIC | default 0 |
| markup | NUMERIC | default 0 |
| total_value | NUMERIC | **GENERATED** = (qty * unit_price) * (1 + markup/100) |
| committed_cost | NUMERIC | default 0 |
| actual_cost | NUMERIC | default 0 |
| billed_to_date | NUMERIC | default 0 |
| paid_to_date | NUMERIC | default 0 |
| invoiced_to_date | NUMERIC | default 0 |
| retention_held | NUMERIC | default 0 |
| balance_remaining | NUMERIC | **GENERATED** = total_value - billed_to_date |
| percent_complete | NUMERIC | default 0 |
| change_order_id | UUID | nullable |
| is_addendum | BOOLEAN | default false |
| notes | TEXT | nullable |
| sort_order | INTEGER | default 0 |

## Constraints
- UNIQUE (contract_id, line_number)

## Next Step
- Step 3: React Query hooks (`useContracts.ts`, `useSovLines.ts`)
