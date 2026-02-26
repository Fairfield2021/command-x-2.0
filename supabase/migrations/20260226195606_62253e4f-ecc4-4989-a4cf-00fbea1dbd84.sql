
-- 1. Core recalculation function for SOV line totals
CREATE OR REPLACE FUNCTION public.recalculate_sov_line_totals(p_sov_line_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_committed NUMERIC(15,2);
  v_billed NUMERIC(15,2);
  v_invoiced NUMERIC(15,2);
  v_total_value NUMERIC(15,2);
  v_pct NUMERIC(5,2);
BEGIN
  IF p_sov_line_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(total), 0) INTO v_committed
  FROM po_line_items WHERE sov_line_id = p_sov_line_id;

  SELECT COALESCE(SUM(total), 0) INTO v_billed
  FROM vendor_bill_line_items WHERE sov_line_id = p_sov_line_id;

  SELECT COALESCE(SUM(total), 0) INTO v_invoiced
  FROM invoice_line_items WHERE sov_line_id = p_sov_line_id;

  SELECT total_value INTO v_total_value
  FROM sov_lines WHERE id = p_sov_line_id;

  IF v_total_value IS NOT NULL AND v_total_value > 0 THEN
    v_pct := ROUND((v_invoiced / v_total_value) * 100, 2);
  ELSE
    v_pct := 0;
  END IF;

  UPDATE sov_lines SET
    committed_cost = v_committed,
    billed_to_date = v_billed,
    invoiced_to_date = v_invoiced,
    percent_complete = v_pct
  WHERE id = p_sov_line_id;
END;
$$;

-- 2a. Trigger function for po_line_items
CREATE OR REPLACE FUNCTION public.trigger_recalc_sov_from_po_line_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sov_line_id IS NOT NULL THEN
      PERFORM recalculate_sov_line_totals(OLD.sov_line_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.sov_line_id IS DISTINCT FROM NEW.sov_line_id THEN
      IF OLD.sov_line_id IS NOT NULL THEN
        PERFORM recalculate_sov_line_totals(OLD.sov_line_id);
      END IF;
    END IF;
  END IF;

  IF NEW.sov_line_id IS NOT NULL THEN
    PERFORM recalculate_sov_line_totals(NEW.sov_line_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_sov_from_po_line_items
AFTER INSERT OR UPDATE OR DELETE ON public.po_line_items
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_sov_from_po_line_items();

-- 2b. Trigger function for vendor_bill_line_items
CREATE OR REPLACE FUNCTION public.trigger_recalc_sov_from_vendor_bill_line_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sov_line_id IS NOT NULL THEN
      PERFORM recalculate_sov_line_totals(OLD.sov_line_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.sov_line_id IS DISTINCT FROM NEW.sov_line_id THEN
      IF OLD.sov_line_id IS NOT NULL THEN
        PERFORM recalculate_sov_line_totals(OLD.sov_line_id);
      END IF;
    END IF;
  END IF;

  IF NEW.sov_line_id IS NOT NULL THEN
    PERFORM recalculate_sov_line_totals(NEW.sov_line_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_sov_from_vendor_bill_line_items
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_bill_line_items
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_sov_from_vendor_bill_line_items();

-- 2c. Trigger function for invoice_line_items
CREATE OR REPLACE FUNCTION public.trigger_recalc_sov_from_invoice_line_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sov_line_id IS NOT NULL THEN
      PERFORM recalculate_sov_line_totals(OLD.sov_line_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.sov_line_id IS DISTINCT FROM NEW.sov_line_id THEN
      IF OLD.sov_line_id IS NOT NULL THEN
        PERFORM recalculate_sov_line_totals(OLD.sov_line_id);
      END IF;
    END IF;
  END IF;

  IF NEW.sov_line_id IS NOT NULL THEN
    PERFORM recalculate_sov_line_totals(NEW.sov_line_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_sov_from_invoice_line_items
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_sov_from_invoice_line_items();

-- 3. Contract value recalculation function
CREATE OR REPLACE FUNCTION public.recalculate_contract_original_value(p_contract_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_original NUMERIC(15,2);
  v_addendum NUMERIC(15,2);
BEGIN
  IF p_contract_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(total_value), 0) INTO v_original
  FROM sov_lines WHERE contract_id = p_contract_id AND is_addendum = false;

  SELECT COALESCE(SUM(total_value), 0) INTO v_addendum
  FROM sov_lines WHERE contract_id = p_contract_id AND is_addendum = true;

  UPDATE contracts SET
    original_value = v_original,
    addendum_value = v_addendum
  WHERE id = p_contract_id;
END;
$$;

-- 4. Trigger function + trigger on sov_lines for contract recalc
CREATE OR REPLACE FUNCTION public.trigger_recalc_contract_from_sov_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.contract_id IS NOT NULL THEN
      PERFORM recalculate_contract_original_value(OLD.contract_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.contract_id IS DISTINCT FROM NEW.contract_id THEN
      IF OLD.contract_id IS NOT NULL THEN
        PERFORM recalculate_contract_original_value(OLD.contract_id);
      END IF;
    END IF;
  END IF;

  IF NEW.contract_id IS NOT NULL THEN
    PERFORM recalculate_contract_original_value(NEW.contract_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_contract_from_sov_lines
AFTER INSERT OR UPDATE OR DELETE ON public.sov_lines
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_contract_from_sov_lines();
