ALTER TABLE public.sov_lines DROP COLUMN balance_remaining;

ALTER TABLE public.sov_lines ADD COLUMN balance_remaining NUMERIC GENERATED ALWAYS AS (((quantity * unit_price) * (1 + markup / 100)) - invoiced_to_date) STORED;