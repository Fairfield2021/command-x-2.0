-- Add missing columns to change_orders
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id);
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS qb_estimate_id TEXT;
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS sent_to TEXT;
ALTER TABLE public.change_orders ADD COLUMN IF NOT EXISTS co_value NUMERIC NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_orders_contract_id ON public.change_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON public.change_orders(project_id);