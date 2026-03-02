
-- Function: approve_change_order
-- Creates SOV lines from CO line items, updates CO status, handles deductive COs
CREATE OR REPLACE FUNCTION public.approve_change_order(p_change_order_id UUID, p_approved_by UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_co RECORD;
  v_contract_id UUID;
  v_max_line_number INTEGER;
  v_line_counter INTEGER := 0;
  v_item RECORD;
BEGIN
  -- 1. Get the change order
  SELECT * INTO v_co FROM public.change_orders WHERE id = p_change_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change order not found';
  END IF;

  -- Idempotency check
  IF v_co.approval_status = 'approved' THEN
    RAISE EXCEPTION 'Change order is already approved';
  END IF;

  v_contract_id := v_co.contract_id;

  -- 2. Get the current max line number in the contract's SOV
  SELECT COALESCE(MAX(line_number), 0) INTO v_max_line_number
  FROM public.sov_lines
  WHERE contract_id = v_contract_id;

  -- 3. Create SOV lines from change_order_line_items
  FOR v_item IN
    SELECT * FROM public.change_order_line_items
    WHERE change_order_id = p_change_order_id
    ORDER BY sort_order, created_at
  LOOP
    v_line_counter := v_line_counter + 1;

    INSERT INTO public.sov_lines (
      contract_id, line_number, description, product_id,
      unit, quantity, unit_price, markup, is_addendum, change_order_id
    ) VALUES (
      v_contract_id, v_max_line_number + v_line_counter,
      v_item.description, v_item.product_id,
      NULL, v_item.quantity, v_item.unit_price, v_item.markup,
      true, p_change_order_id
    );
  END LOOP;

  -- 4. Update the change order status
  UPDATE public.change_orders SET
    approval_status = 'approved',
    approval_date = NOW(),
    approved_by = p_approved_by
  WHERE id = p_change_order_id;

  -- 5. Handle deductive COs
  IF v_co.change_type = 'deductive' THEN
    UPDATE public.contracts SET
      deduction_value = COALESCE(deduction_value, 0) + v_co.co_value
    WHERE id = v_contract_id;
  END IF;
END;
$$;

-- Function: reject_change_order
CREATE OR REPLACE FUNCTION public.reject_change_order(p_change_order_id UUID, p_rejected_by UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.change_orders SET
    approval_status = 'rejected',
    approval_date = NOW(),
    approved_by = p_rejected_by
  WHERE id = p_change_order_id;
END;
$$;
