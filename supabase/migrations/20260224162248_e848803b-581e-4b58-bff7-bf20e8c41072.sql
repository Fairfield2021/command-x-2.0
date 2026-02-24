
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
  -- Determine the transaction date column safely per table
  v_txn_date := CASE TG_TABLE_NAME
    WHEN 'invoices' THEN NEW.due_date::date
    WHEN 'estimates' THEN NEW.date::date
    WHEN 'vendor_bills' THEN NEW.bill_date::date
    WHEN 'purchase_orders' THEN NEW.due_date::date
    WHEN 'change_orders' THEN NEW.created_at::date
    ELSE NEW.created_at::date
  END;

  -- If no date found, allow
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

  IF NOT v_settings_found THEN
    RAISE EXCEPTION 'Cannot verify accounting period status. Transaction blocked for safety. Please contact an administrator.';
  END IF;

  -- Check global locked period date
  IF v_locked_period_enabled AND v_locked_period_date IS NOT NULL AND v_txn_date <= v_locked_period_date THEN
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
    EXCEPTION WHEN OTHERS THEN NULL;
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
