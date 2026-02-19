import { useQuery } from "@tanstack/react-query";
import { supabase } from "../client";

interface SubledgerTotals {
  recognizedRevenue: number;
  actualCosts: number;
}

export const useProjectSubledgerTotals = (
  projectId: string | undefined,
  cutoverDate: string | null
) => {
  return useQuery({
    queryKey: ["project-subledger-totals", projectId, cutoverDate],
    queryFn: async (): Promise<SubledgerTotals> => {
      if (!projectId) return { recognizedRevenue: 0, actualCosts: 0 };

      // Query accounting_lines joined with accounting_transactions for this project
      let query = supabase
        .from("accounting_lines")
        .select(`
          debit_amount,
          credit_amount,
          transaction_id,
          accounting_transactions!inner (
            transaction_type,
            status,
            transaction_date
          )
        `)
        .eq("project_id", projectId)
        .eq("accounting_transactions.status", "posted");

      if (cutoverDate) {
        query = query.gte("accounting_transactions.transaction_date", cutoverDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Subledger totals query error:", error);
        return { recognizedRevenue: 0, actualCosts: 0 };
      }

      let recognizedRevenue = 0;
      let actualCosts = 0;

      for (const line of data || []) {
        const txn = line.accounting_transactions as any;
        if (!txn) continue;

        if (txn.transaction_type === "invoice") {
          recognizedRevenue += line.debit_amount || 0;
        } else if (["bill", "payroll"].includes(txn.transaction_type)) {
          actualCosts += line.debit_amount || 0;
        }
      }

      return { recognizedRevenue, actualCosts };
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};
