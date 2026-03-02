
-- 1. Add payment_status to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'committed';

-- 2. Add payment_status to vendor_bills
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

-- 3. Add amount_paid to vendor_bills
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;

-- 4. Replace recalculate_sov_line_totals with paid_to_date support
CREATE OR REPLACE FUNCTION public.recalculate_sov_line_totals(p_sov_line_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_committed NUMERIC(15,2);
  v_billed NUMERIC(15,2);
  v_paid NUMERIC(15,2);
  v_invoiced NUMERIC(15,2);
  v_total_value NUMERIC(15,2);
  v_pct NUMERIC(5,2);
BEGIN
  IF p_sov_line_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(total), 0) INTO v_committed
  FROM po_line_items WHERE sov_line_id = p_sov_line_id;

  SELECT COALESCE(SUM(total), 0) INTO v_billed
  FROM vendor_bill_line_items WHERE sov_line_id = p_sov_line_id;

  SELECT COALESCE(SUM(vbli.total), 0) INTO v_paid
  FROM vendor_bill_line_items vbli
  JOIN vendor_bills vb ON vb.id = vbli.bill_id
  WHERE vbli.sov_line_id = p_sov_line_id
    AND vb.payment_status = 'paid';

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
    paid_to_date = v_paid,
    invoiced_to_date = v_invoiced,
    percent_complete = v_pct
  WHERE id = p_sov_line_id;
END;
$function$;

-- 5. New trigger function for bill payment status changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_sov_from_bill_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalculate_sov_line_totals(vbli.sov_line_id)
  FROM public.vendor_bill_line_items vbli
  WHERE vbli.bill_id = NEW.id
    AND vbli.sov_line_id IS NOT NULL;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER recalc_sov_from_bill_payment
  AFTER UPDATE OF payment_status ON public.vendor_bills
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.trigger_recalc_sov_from_bill_payment();
