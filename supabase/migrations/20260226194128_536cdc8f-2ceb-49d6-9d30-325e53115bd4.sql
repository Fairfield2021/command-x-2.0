ALTER TABLE public.purchase_orders
  ADD COLUMN order_type TEXT NOT NULL DEFAULT 'purchase_order';

COMMENT ON COLUMN public.purchase_orders.order_type IS 'Values: purchase_order (materials/vendors) or work_order (labor/contractors)';