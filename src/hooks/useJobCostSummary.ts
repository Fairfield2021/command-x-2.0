import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobCostSummary {
  project_id: string;
  project_name: string;
  contract_id: string | null;
  contract_status: string | null;
  original_value: number;
  addendum_value: number;
  deduction_value: number;
  total_contract_value: number;
  total_committed: number;
  total_billed: number;
  total_expenses: number;
  open_commitments: number;
  total_invoiced: number;
  total_remaining: number;
  gross_profit: number;
  margin_percent: number;
  avg_percent_complete: number;
  total_sov_lines: number;
}

export const useJobCostSummary = (projectId: string | null) => {
  return useQuery({
    queryKey: ["job-cost-summary", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("job_cost_summary")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data as JobCostSummary | null;
    },
    enabled: !!projectId,
  });
};

export const useAllJobCostSummaries = () => {
  return useQuery({
    queryKey: ["job-cost-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_cost_summary")
        .select("*");
      if (error) throw error;
      return data as JobCostSummary[];
    },
  });
};
