

# Fix `balance_remaining` Generated Column on `sov_lines`

## Migration

Single migration with two statements:

```sql
ALTER TABLE public.sov_lines DROP COLUMN balance_remaining;

ALTER TABLE public.sov_lines ADD COLUMN balance_remaining NUMERIC GENERATED ALWAYS AS (((quantity * unit_price) * (1 + markup / 100)) - invoiced_to_date) STORED;
```

Changes formula from `- billed_to_date` to `- invoiced_to_date` so balance tracks remaining invoiceable amount to customer.

No code file changes. No other table changes.

