import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SovLine {
  id: string;
  contract_id: string;
  line_number: number;
  description: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  markup: number;
  total_value: number | null;
  committed_cost: number;
  actual_cost: number;
  billed_to_date: number;
  paid_to_date: number;
  invoiced_to_date: number;
  retention_held: number;
  balance_remaining: number | null;
  percent_complete: number;
  change_order_id: string | null;
  is_addendum: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useSovLines = (contractId: string | null) => {
  return useQuery({
    queryKey: ["sov_lines", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from("sov_lines")
        .select("*")
        .eq("contract_id", contractId)
        .order("sort_order", { ascending: true })
        .order("line_number", { ascending: true });
      if (error) throw error;
      return data as SovLine[];
    },
    enabled: !!contractId,
  });
};

export const useAddSovLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (line: Omit<SovLine, "id" | "created_at" | "updated_at" | "total_value" | "balance_remaining">) => {
      const { data, error } = await supabase
        .from("sov_lines")
        .insert([line])
        .select()
        .single();
      if (error) throw error;
      return data as SovLine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sov_lines", data.contract_id] });
      toast.success("SOV line added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add SOV line: ${error.message}`);
    },
  });
};

export const useBulkCreateSovLines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lines: Omit<SovLine, "id" | "created_at" | "updated_at" | "total_value" | "balance_remaining">[]) => {
      if (lines.length === 0) return [];
      const { data, error } = await supabase
        .from("sov_lines")
        .insert(lines)
        .select();
      if (error) throw error;
      return data as SovLine[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["sov_lines", data[0].contract_id] });
      }
      toast.success(`${data.length} SOV lines created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SOV lines: ${error.message}`);
    },
  });
};

export const useUpdateSovLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SovLine> & { id: string; contract_id: string }) => {
      const { data, error } = await supabase
        .from("sov_lines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SovLine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sov_lines", data.contract_id] });
      toast.success("SOV line updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update SOV line: ${error.message}`);
    },
  });
};

export const useDeleteSovLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contractId }: { id: string; contractId: string }) => {
      const { error } = await supabase
        .from("sov_lines")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return contractId;
    },
    onSuccess: (contractId) => {
      queryClient.invalidateQueries({ queryKey: ["sov_lines", contractId] });
      toast.success("SOV line deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete SOV line: ${error.message}`);
    },
  });
};
