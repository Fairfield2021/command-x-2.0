

# Add `sov_line_id` to `invoice_line_items`

## Database Migration

```sql
ALTER TABLE public.invoice_line_items
  ADD COLUMN sov_line_id UUID REFERENCES public.sov_lines(id) ON DELETE SET NULL;

CREATE INDEX idx_invoice_line_items_sov_line_id
  ON public.invoice_line_items(sov_line_id);
```

No code changes needed — nullable FK column + index on an existing table.

