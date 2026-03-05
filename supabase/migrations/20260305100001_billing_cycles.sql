-- Billing cycles table: tracks billing periods per project
CREATE TABLE IF NOT EXISTS public.billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  total_billed NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_retained NUMERIC(15,2) NOT NULL DEFAULT 0,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, cycle_number)
);

-- Index for lookups
CREATE INDEX idx_billing_cycles_project_id ON public.billing_cycles(project_id);
CREATE INDEX idx_billing_cycles_status ON public.billing_cycles(status);

-- Auto-update updated_at
CREATE TRIGGER update_billing_cycles_updated_at
  BEFORE UPDATE ON public.billing_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_cycles_select" ON public.billing_cycles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "billing_cycles_insert" ON public.billing_cycles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "billing_cycles_update" ON public.billing_cycles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "billing_cycles_delete" ON public.billing_cycles
  FOR DELETE TO authenticated USING (true);
