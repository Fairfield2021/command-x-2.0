-- RPC: validate_progressive_billing
-- Checks whether adding p_amount to a SoV line would exceed its total_value.
-- p_exclude_id: optional invoice_line_item ID to exclude (for edits).
-- Returns JSON: { allowed: bool, message: text, remaining: numeric }

CREATE OR REPLACE FUNCTION public.validate_progressive_billing(
  p_sov_line_id UUID,
  p_amount NUMERIC,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_value NUMERIC;
  v_invoiced NUMERIC;
  v_remaining NUMERIC;
  v_description TEXT;
  v_line_number INT;
BEGIN
  -- Get SoV line details
  SELECT total_value, invoiced_to_date, description, line_number
  INTO v_total_value, v_invoiced, v_description, v_line_number
  FROM sov_lines
  WHERE id = p_sov_line_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'SoV line not found',
      'remaining', 0
    );
  END IF;

  -- If excluding an existing line item (edit scenario), subtract its current total
  IF p_exclude_id IS NOT NULL THEN
    v_invoiced := v_invoiced - COALESCE(
      (SELECT total FROM invoice_line_items WHERE id = p_exclude_id AND sov_line_id = p_sov_line_id),
      0
    );
  END IF;

  v_remaining := COALESCE(v_total_value, 0) - v_invoiced;

  IF p_amount > v_remaining THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', format(
        'SoV Line #%s ("%s") would be overbilled: $%s exceeds remaining $%s',
        v_line_number,
        v_description,
        to_char(v_invoiced + p_amount, 'FM999,999,999.00'),
        to_char(v_remaining, 'FM999,999,999.00')
      ),
      'remaining', v_remaining
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'message', 'OK',
    'remaining', v_remaining
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_progressive_billing(UUID, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_progressive_billing(UUID, NUMERIC, UUID) TO service_role;
