import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BillingCycle {
  id: string;
  project_id: string;
  cycle_number: number;
  period_start: string;
  period_end: string;
  status: "draft" | "submitted" | "approved" | "paid";
  total_billed: number;
  total_retained: number;
  invoice_id: string | null;
  notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useBillingCycles = (projectId: string | null) => {
  return useQuery({
    queryKey: ["billing_cycles", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("billing_cycles")
        .select("*")
        .eq("project_id", projectId)
        .order("cycle_number", { ascending: true });
      if (error) throw error;
      return data as BillingCycle[];
    },
    enabled: !!projectId,
  });
};

export const useAddBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycle: Omit<BillingCycle, "id" | "created_at" | "updated_at" | "submitted_at" | "approved_at">) => {
      const { data, error } = await supabase
        .from("billing_cycles")
        .insert([cycle])
        .select()
        .single();
      if (error) throw error;
      return data as BillingCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_cycles", data.project_id] });
      toast.success(`Billing cycle #${data.cycle_number} created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create billing cycle: ${error.message}`);
    },
  });
};

export const useUpdateBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      ...updates
    }: Partial<BillingCycle> & { id: string; projectId: string }) => {
      const { data, error } = await supabase
        .from("billing_cycles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, projectId } as BillingCycle & { projectId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_cycles", data.projectId] });
      toast.success("Billing cycle updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update billing cycle: ${error.message}`);
    },
  });
};

export const useSubmitBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { data, error } = await supabase
        .from("billing_cycles")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_cycles", data.projectId] });
      toast.success("Billing cycle submitted for approval");
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit billing cycle: ${error.message}`);
    },
  });
};

export const useApproveBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { data, error } = await supabase
        .from("billing_cycles")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_cycles", data.projectId] });
      toast.success("Billing cycle approved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve billing cycle: ${error.message}`);
    },
  });
};
