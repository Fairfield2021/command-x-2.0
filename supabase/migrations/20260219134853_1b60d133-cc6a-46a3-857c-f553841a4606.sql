
-- =====================================================================
-- Step 2: RBAC & RLS Hardening Migration
-- =====================================================================

-- 1. Create is_assigned_to_project() security definer function
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_assignments
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND status = 'active'
  )
$$;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON public.project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON public.project_assignments(project_id);

-- =====================================================================
-- 3. PROJECTS
-- =====================================================================
DROP POLICY IF EXISTS "Staff can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can manage projects" ON public.projects;

CREATE POLICY "Privileged roles can view all projects"
ON public.projects FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view assigned projects"
ON public.projects FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), id)
);

CREATE POLICY "Admins managers accounting can manage projects"
ON public.projects FOR ALL TO authenticated
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

-- =====================================================================
-- 4. INVOICES (has project_id)
-- =====================================================================
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins and managers can manage invoices" ON public.invoices;

CREATE POLICY "Privileged roles can view all invoices"
ON public.invoices FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view invoices for assigned projects"
ON public.invoices FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), project_id)
);

CREATE POLICY "Admins managers accounting can manage invoices"
ON public.invoices FOR ALL TO authenticated
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

-- =====================================================================
-- 5. ESTIMATES (has project_id)
-- =====================================================================
DROP POLICY IF EXISTS "Staff can view estimates" ON public.estimates;
DROP POLICY IF EXISTS "Admins and managers can manage estimates" ON public.estimates;

CREATE POLICY "Privileged roles can view all estimates"
ON public.estimates FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view estimates for assigned projects"
ON public.estimates FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), project_id)
);

CREATE POLICY "Admins managers accounting can manage estimates"
ON public.estimates FOR ALL TO authenticated
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

-- =====================================================================
-- 6. PURCHASE_ORDERS (has project_id)
-- =====================================================================
DROP POLICY IF EXISTS "Staff can view all purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins and managers can manage purchase orders" ON public.purchase_orders;

CREATE POLICY "Privileged roles can view all purchase orders"
ON public.purchase_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view purchase orders for assigned projects"
ON public.purchase_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), project_id)
);

CREATE POLICY "Admins managers accounting can manage purchase orders"
ON public.purchase_orders FOR ALL TO authenticated
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

-- =====================================================================
-- 7. CHANGE_ORDERS (has project_id)
-- =====================================================================
DROP POLICY IF EXISTS "Staff can view change orders" ON public.change_orders;
DROP POLICY IF EXISTS "Admins and managers can manage change orders" ON public.change_orders;

CREATE POLICY "Privileged roles can view all change orders"
ON public.change_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view change orders for assigned projects"
ON public.change_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), project_id)
);

CREATE POLICY "Admins managers accounting can manage change orders"
ON public.change_orders FOR ALL TO authenticated
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

-- =====================================================================
-- 8. VENDOR_BILLS (no project_id — joins via purchase_order_id)
-- =====================================================================
DROP POLICY IF EXISTS "Staff can view vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Admins and managers can view all vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Admins and managers can manage vendor bills" ON public.vendor_bills;

CREATE POLICY "Privileged roles can view all vendor bills"
ON public.vendor_bills FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view vendor bills for assigned projects"
ON public.vendor_bills FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = vendor_bills.purchase_order_id
    AND is_assigned_to_project(auth.uid(), po.project_id)
  )
);

CREATE POLICY "Admins managers accounting can manage vendor bills"
ON public.vendor_bills FOR ALL TO authenticated
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

-- =====================================================================
-- 9. PROJECT_DOCUMENTS (has project_id)
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Admins and managers can manage project documents" ON public.project_documents;

CREATE POLICY "Privileged roles can view all project documents"
ON public.project_documents FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view documents for assigned projects"
ON public.project_documents FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), project_id)
);

CREATE POLICY "Admins managers accounting can manage project documents"
ON public.project_documents FOR ALL TO authenticated
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

-- =====================================================================
-- 10. PROJECT_TASK_ORDERS (has project_id)
-- Keep "Public can view task orders with open job postings" intact
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view task orders" ON public.project_task_orders;
DROP POLICY IF EXISTS "Admins and managers can manage task orders" ON public.project_task_orders;

CREATE POLICY "Privileged roles can view all task orders"
ON public.project_task_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view task orders for assigned projects"
ON public.project_task_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  is_assigned_to_project(auth.uid(), project_id)
);

CREATE POLICY "Admins managers accounting can manage task orders"
ON public.project_task_orders FOR ALL TO authenticated
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

-- =====================================================================
-- 11. PO_ADDENDUMS (no project_id — joins via purchase_order_id)
-- Keep vendor and approval token policies intact
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view po_addendums" ON public.po_addendums;
DROP POLICY IF EXISTS "Admins and managers can manage po_addendums" ON public.po_addendums;

CREATE POLICY "Privileged roles can view all po addendums"
ON public.po_addendums FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accounting')
);

CREATE POLICY "Users can view po addendums for assigned projects"
ON public.po_addendums FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'user') AND
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_addendums.purchase_order_id
    AND is_assigned_to_project(auth.uid(), po.project_id)
  )
);

CREATE POLICY "Admins managers accounting can manage po addendums"
ON public.po_addendums FOR ALL TO authenticated
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

-- =====================================================================
-- 12. EXPENSE_CATEGORIES: Add accounting to manage policy
-- Keep qual:true for SELECT (reference data)
-- =====================================================================
DROP POLICY IF EXISTS "Admins and managers can manage expense categories" ON public.expense_categories;

CREATE POLICY "Admins managers accounting can manage expense categories"
ON public.expense_categories FOR ALL TO authenticated
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
