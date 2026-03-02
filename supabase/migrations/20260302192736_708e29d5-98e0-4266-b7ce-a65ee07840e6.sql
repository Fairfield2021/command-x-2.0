
CREATE OR REPLACE VIEW public.job_cost_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  c.id AS contract_id,
  c.status AS contract_status,
  c.original_value,
  c.addendum_value,
  c.deduction_value,
  c.current_value AS total_contract_value,
  COALESCE(SUM(s.committed_cost), 0) AS total_committed,
  COALESCE(SUM(s.billed_to_date), 0) AS total_billed,
  COALESCE(SUM(s.paid_to_date), 0) AS total_expenses,
  COALESCE(SUM(s.committed_cost) - SUM(s.paid_to_date), 0) AS open_commitments,
  COALESCE(SUM(s.invoiced_to_date), 0) AS total_invoiced,
  COALESCE(SUM(s.balance_remaining), 0) AS total_remaining,
  COALESCE(SUM(s.invoiced_to_date) - SUM(s.paid_to_date), 0) AS gross_profit,
  CASE
    WHEN COALESCE(SUM(s.invoiced_to_date), 0) > 0
    THEN ROUND(((SUM(s.invoiced_to_date) - SUM(s.paid_to_date)) / SUM(s.invoiced_to_date)) * 100, 2)
    ELSE 0
  END AS margin_percent,
  CASE
    WHEN COUNT(s.id) > 0
    THEN ROUND(AVG(s.percent_complete), 2)
    ELSE 0
  END AS avg_percent_complete,
  COUNT(s.id) AS total_sov_lines
FROM public.projects p
LEFT JOIN public.contracts c ON c.project_id = p.id
LEFT JOIN public.sov_lines s ON s.contract_id = c.id
GROUP BY p.id, p.name, c.id, c.status, c.original_value, c.addendum_value, c.deduction_value, c.current_value;

GRANT SELECT ON public.job_cost_summary TO authenticated;
