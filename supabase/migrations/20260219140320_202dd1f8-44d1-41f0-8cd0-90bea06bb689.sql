
-- ============================================================
-- Step 3: Accounting Period Guardrails
-- ============================================================

-- 1. Create accounting_periods table
CREATE TABLE public.accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  fiscal_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT accounting_periods_date_range CHECK (end_date >= start_date),
  CONSTRAINT accounting_periods_unique_range UNIQUE (start_date, end_date)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

-- SELECT: admin, manager, accounting
CREATE POLICY "Admin/manager/accounting can view accounting periods"
  ON public.accounting_periods FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'accounting')
  );

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "Admin can manage accounting periods"
  ON public.accounting_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for period lookups by date range
CREATE INDEX idx_accounting_periods_dates ON public.accounting_periods (start_date, end_date) WHERE is_locked = true;
CREATE INDEX idx_accounting_periods_fiscal_year ON public.accounting_periods (fiscal_year);

-- 2. Create accounting_period_audit_log table
CREATE TABLE public.accounting_period_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('lock', 'unlock')),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.accounting_period_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view audit log"
  ON public.accounting_period_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log"
  ON public.accounting_period_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_accounting_period_audit_log_period ON public.accounting_period_audit_log (period_id);

-- 3. Trigger to auto-log lock/unlock changes on accounting_periods
CREATE OR REPLACE FUNCTION public.log_accounting_period_lock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_locked IS DISTINCT FROM NEW.is_locked THEN
    INSERT INTO public.accounting_period_audit_log (period_id, action, performed_by, details)
    VALUES (
      NEW.id,
      CASE WHEN NEW.is_locked THEN 'lock' ELSE 'unlock' END,
      auth.uid(),
      jsonb_build_object(
        'period_name', NEW.period_name,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );
    -- Also set locked_at/locked_by when locking
    IF NEW.is_locked THEN
      NEW.locked_at := now();
      NEW.locked_by := auth.uid();
    ELSE
      NEW.locked_at := NULL;
      NEW.locked_by := NULL;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_accounting_period_lock
  BEFORE UPDATE ON public.accounting_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.log_accounting_period_lock_change();

-- 4. Trigger function to validate transaction dates are not in locked periods (FAIL-CLOSED)
CREATE OR REPLACE FUNCTION public.validate_transaction_date_not_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn_date DATE;
  v_locked_period_date DATE;
  v_locked_period_enabled BOOLEAN;
  v_locked_period_name TEXT;
  v_settings_found BOOLEAN := false;
BEGIN
  -- Determine the transaction date column
  -- invoices use due_date, estimates use date, vendor_bills use bill_date,
  -- purchase_orders use date, change_orders use created_at
  v_txn_date := COALESCE(
    NEW.due_date::date,
    NEW.bill_date::date,
    NEW.date::date,
    NEW.created_at::date
  );

  -- If no date found, allow (some tables may not have a date yet)
  IF v_txn_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check company_settings locked period (FAIL-CLOSED)
  BEGIN
    SELECT locked_period_date, locked_period_enabled
    INTO v_locked_period_date, v_locked_period_enabled
    FROM public.company_settings
    LIMIT 1;
    v_settings_found := true;
  EXCEPTION WHEN OTHERS THEN
    v_settings_found := false;
  END;

  -- FAIL-CLOSED: if settings can't be read, block the operation
  IF NOT v_settings_found THEN
    RAISE EXCEPTION 'Cannot verify accounting period status. Transaction blocked for safety. Please contact an administrator.';
  END IF;

  -- Check global locked period date
  IF v_locked_period_enabled AND v_locked_period_date IS NOT NULL AND v_txn_date <= v_locked_period_date THEN
    -- Log violation
    BEGIN
      INSERT INTO public.locked_period_violations (
        user_id, entity_type, entity_id, attempted_date,
        locked_period_date, action, blocked, details
      ) VALUES (
        auth.uid(), TG_TABLE_NAME, NEW.id, v_txn_date::text,
        v_locked_period_date::text,
        CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
        true,
        jsonb_build_object('source', 'db_trigger', 'reason', 'global_locked_period')
      );
    EXCEPTION WHEN OTHERS THEN NULL; -- Don't fail if logging fails
    END;
    RAISE EXCEPTION 'Transaction date % is in a locked accounting period (locked through %). Changes are not allowed.',
      v_txn_date, v_locked_period_date;
  END IF;

  -- Check accounting_periods table
  SELECT period_name INTO v_locked_period_name
  FROM public.accounting_periods
  WHERE is_locked = true
    AND v_txn_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF v_locked_period_name IS NOT NULL THEN
    -- Log violation
    BEGIN
      INSERT INTO public.locked_period_violations (
        user_id, entity_type, entity_id, attempted_date,
        locked_period_date, action, blocked, details
      ) VALUES (
        auth.uid(), TG_TABLE_NAME, NEW.id, v_txn_date::text,
        v_locked_period_date::text,
        CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
        true,
        jsonb_build_object('source', 'db_trigger', 'reason', 'accounting_period', 'period_name', v_locked_period_name)
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'Transaction date % falls within locked accounting period "%". Changes are not allowed.',
      v_txn_date, v_locked_period_name;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attach trigger to financial tables
CREATE TRIGGER trg_validate_invoice_date_locked
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_date_not_locked();

CREATE TRIGGER trg_validate_estimate_date_locked
  BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_date_not_locked();

CREATE TRIGGER trg_validate_vendor_bill_date_locked
  BEFORE INSERT OR UPDATE ON public.vendor_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_date_not_locked();

CREATE TRIGGER trg_validate_purchase_order_date_locked
  BEFORE INSERT OR UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_date_not_locked();

CREATE TRIGGER trg_validate_change_order_date_locked
  BEFORE INSERT OR UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_date_not_locked();
