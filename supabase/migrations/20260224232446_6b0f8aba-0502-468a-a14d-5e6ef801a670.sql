
-- Phase 6A Step 1: Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  qb_estimate_id TEXT,
  contract_number TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  original_value NUMERIC NOT NULL DEFAULT 0,
  addendum_value NUMERIC NOT NULL DEFAULT 0,
  deduction_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC GENERATED ALWAYS AS (original_value + addendum_value - deduction_value) STORED,
  scope_of_work TEXT,
  date_signed DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_contracts_customer_id ON public.contracts(customer_id);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Admin/Manager/Accounting: full access
CREATE POLICY "Admin/Manager/Accounting full access on contracts"
  ON public.contracts FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'accounting')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'accounting')
  );

-- Users: SELECT on assigned projects
CREATE POLICY "Users can view contracts for assigned projects"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'user') AND
    is_assigned_to_project(auth.uid(), project_id)
  );

-- Personnel: SELECT on assigned projects
CREATE POLICY "Personnel can view contracts for assigned projects"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'personnel') AND
    EXISTS (
      SELECT 1 FROM public.personnel_project_assignments ppa
      JOIN public.personnel p ON p.id = ppa.personnel_id
      WHERE p.user_id = auth.uid()
        AND ppa.project_id = contracts.project_id
        AND ppa.status = 'active'
    )
  );

-- Vendors: SELECT on projects linked via POs
CREATE POLICY "Vendors can view contracts for PO-linked projects"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'vendor') AND
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      JOIN public.vendors v ON v.id = po.vendor_id
      WHERE v.user_id = auth.uid()
        AND po.project_id = contracts.project_id
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
