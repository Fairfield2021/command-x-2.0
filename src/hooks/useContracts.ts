import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuditLog, computeChanges } from "@/hooks/useAuditLog";
import type { Json } from "@/integrations/supabase/types";

export interface Contract {
  id: string;
  project_id: string | null;
  customer_id: string | null;
  qb_estimate_id: string | null;
  contract_number: string | null;
  title: string;
  status: string;
  original_value: number;
  addendum_value: number;
  deduction_value: number;
  current_value: number | null;
  scope_of_work: string | null;
  date_signed: string | null;
  created_at: string;
  updated_at: string;
}

export const useContracts = () => {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
  });
};

export const useContractsByProject = (projectId: string | null) => {
  return useQuery({
    queryKey: ["contracts", "project", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!projectId,
  });
};

export const useContract = (contractId: string | null) => {
  return useQuery({
    queryKey: ["contracts", contractId],
    queryFn: async () => {
      if (!contractId) return null;
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contractId)
        .single();
      if (error) throw error;
      return data as Contract;
    },
    enabled: !!contractId,
  });
};

export const useAddContract = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (contract: Omit<Contract, "id" | "created_at" | "updated_at" | "current_value">) => {
      const { data, error } = await supabase
        .from("contracts")
        .insert([contract])
        .select()
        .single();
      if (error) throw error;

      await logAction({
        actionType: "create",
        resourceType: "contract",
        resourceId: data.id,
        resourceNumber: data.contract_number || data.title,
        changesAfter: data as unknown as Json,
        metadata: {
          project_id: contract.project_id,
          customer_id: contract.customer_id,
          status: contract.status,
        } as Json,
      });

      return data as Contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contract: ${error.message}`);
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      const { data: originalData } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("contracts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const { changesBefore, changesAfter } = computeChanges(
        originalData as Record<string, unknown>,
        data as Record<string, unknown>
      );
      await logAction({
        actionType: "update",
        resourceType: "contract",
        resourceId: id,
        resourceNumber: data.contract_number || data.title,
        changesBefore,
        changesAfter,
      });

      return data as Contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contract: ${error.message}`);
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: originalData } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", id);
      if (error) throw error;

      await logAction({
        actionType: "delete",
        resourceType: "contract",
        resourceId: id,
        resourceNumber: originalData?.contract_number || originalData?.title,
        changesBefore: originalData as unknown as Json,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contract: ${error.message}`);
    },
  });
};
