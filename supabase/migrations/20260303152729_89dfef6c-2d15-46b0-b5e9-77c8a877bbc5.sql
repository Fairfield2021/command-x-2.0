
-- AP Aging Summary View
-- Joins through vendor_bill_line_items to get project context since vendor_bills has no project_id
CREATE OR REPLACE VIEW public.ap_aging_summary AS
SELECT
  vb.id AS bill_id,
  vb.number AS bill_number,
  vb.vendor_id,
  v.name AS vendor_name,
  li.project_id,
  p.name AS project_name,
  vb.total AS total_amount,
  vb.amount_paid,
  (vb.total - vb.amount_paid) AS balance_due,
  vb.payment_status,
  vb.bill_date,
  vb.due_date,
  CASE
    WHEN vb.due_date IS NULL THEN 'unknown'
    WHEN CURRENT_DATE - vb.due_date <= 0 THEN 'current'
    WHEN CURRENT_DATE - vb.due_date BETWEEN 1 AND 30 THEN '1-30'
    WHEN CURRENT_DATE - vb.due_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - vb.due_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket,
  GREATEST(CURRENT_DATE - vb.due_date, 0) AS days_past_due
FROM public.vendor_bills vb
LEFT JOIN public.vendors v ON v.id = vb.vendor_id
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (vbli.bill_id) vbli.project_id
  FROM public.vendor_bill_line_items vbli
  WHERE vbli.bill_id = vb.id AND vbli.project_id IS NOT NULL
  LIMIT 1
) li ON true
LEFT JOIN public.projects p ON p.id = li.project_id
WHERE vb.payment_status != 'paid'
  AND vb.deleted_at IS NULL;

GRANT SELECT ON public.ap_aging_summary TO authenticated;

-- Portfolio Financial Summary View
CREATE OR REPLACE VIEW public.portfolio_summary AS
SELECT
  COUNT(DISTINCT jcs.project_id) FILTER (WHERE jcs.contract_status = 'active') AS active_projects,
  COALESCE(SUM(jcs.total_contract_value) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_contract_value,
  COALESCE(SUM(jcs.total_committed) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_committed,
  COALESCE(SUM(jcs.open_commitments) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_open_commitments,
  COALESCE(SUM(jcs.total_billed) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_ap,
  COALESCE(SUM(jcs.total_expenses) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_expenses,
  COALESCE(SUM(jcs.total_invoiced) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_invoiced,
  COALESCE(SUM(jcs.gross_profit) FILTER (WHERE jcs.contract_status = 'active'), 0) AS total_gross_profit,
  CASE
    WHEN COALESCE(SUM(jcs.total_invoiced) FILTER (WHERE jcs.contract_status = 'active'), 0) > 0
    THEN ROUND(((SUM(jcs.total_invoiced) FILTER (WHERE jcs.contract_status = 'active') - SUM(jcs.total_expenses) FILTER (WHERE jcs.contract_status = 'active')) / SUM(jcs.total_invoiced) FILTER (WHERE jcs.contract_status = 'active')) * 100, 2)
    ELSE 0
  END AS overall_margin_percent,
  CASE
    WHEN COUNT(DISTINCT jcs.project_id) FILTER (WHERE jcs.contract_status = 'active') > 0
    THEN ROUND(AVG(jcs.avg_percent_complete) FILTER (WHERE jcs.contract_status = 'active'), 2)
    ELSE 0
  END AS avg_completion
FROM public.job_cost_summary jcs;

GRANT SELECT ON public.portfolio_summary TO authenticated;
