
-- Step 2: Create sov_lines table (child of contracts)
CREATE TABLE public.sov_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  markup NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS ((quantity * unit_price) * (1 + markup / 100)) STORED,
  committed_cost NUMERIC NOT NULL DEFAULT 0,
  actual_cost NUMERIC NOT NULL DEFAULT 0,
  billed_to_date NUMERIC NOT NULL DEFAULT 0,
  paid_to_date NUMERIC NOT NULL DEFAULT 0,
  invoiced_to_date NUMERIC NOT NULL DEFAULT 0,
  retention_held NUMERIC NOT NULL DEFAULT 0,
  balance_remaining NUMERIC GENERATED ALWAYS AS (((quantity * unit_price) * (1 + markup / 100)) - billed_to_date) STORED,
  percent_complete NUMERIC NOT NULL DEFAULT 0,
  change_order_id UUID,
  is_addendum BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sov_line_number UNIQUE (contract_id, line_number)
);

-- Indexes
CREATE INDEX idx_sov_lines_contract_id ON public.sov_lines(contract_id);
CREATE INDEX idx_sov_lines_product_id ON public.sov_lines(product_id);

-- Updated_at trigger
CREATE TRIGGER update_sov_lines_updated_at
  BEFORE UPDATE ON public.sov_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.sov_lines ENABLE ROW LEVEL SECURITY;

-- RLS: Admin/Manager/Accounting full access
CREATE POLICY "sov_lines_admin_manager_accounting_all"
  ON public.sov_lines
  FOR ALL
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

-- RLS: Users can SELECT sov_lines for contracts on their assigned projects
CREATE POLICY "sov_lines_user_select"
  ON public.sov_lines
  FOR SELECT
  USING (
    has_role(auth.uid(), 'user') AND
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = sov_lines.contract_id
        AND c.project_id IS NOT NULL
        AND is_assigned_to_project(auth.uid(), c.project_id)
    )
  );

-- RLS: Personnel can SELECT sov_lines for contracts on their assigned projects
CREATE POLICY "sov_lines_personnel_select"
  ON public.sov_lines
  FOR SELECT
  USING (
    has_role(auth.uid(), 'personnel') AND
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = sov_lines.contract_id
        AND c.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.personnel_project_assignments ppa
          WHERE ppa.project_id = c.project_id
            AND ppa.personnel_id = get_personnel_id_for_user(auth.uid())
            AND ppa.status = 'active'
        )
    )
  );

-- RLS: Vendors can SELECT sov_lines for contracts on projects linked via their POs
CREATE POLICY "sov_lines_vendor_select"
  ON public.sov_lines
  FOR SELECT
  USING (
    has_role(auth.uid(), 'vendor') AND
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = sov_lines.contract_id
        AND c.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.project_id = c.project_id
            AND po.vendor_id = get_vendor_id_for_user(auth.uid())
        )
    )
  );
