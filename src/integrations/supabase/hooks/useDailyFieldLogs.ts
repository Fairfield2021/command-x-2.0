import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DailyFieldLog {
  id: string;
  project_id: string;
  log_date: string;
  created_by: string;
  weather_conditions: string | null;
  crew_count: number;
  work_performed: string | null;
  safety_incidents: string | null;
  delays: string | null;
  notes: string | null;
  status: "draft" | "submitted" | "approved";
  created_at: string;
  updated_at: string;
}

export function useDailyFieldLogs(projectId: string | undefined) {
  return useQuery({
    queryKey: ["daily-field-logs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("daily_field_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data as DailyFieldLog[];
    },
    enabled: !!projectId,
  });
}

export function useCreateFieldLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      project_id: string;
      log_date: string;
      weather_conditions?: string;
      crew_count?: number;
      work_performed?: string;
      safety_incidents?: string;
      delays?: string;
      notes?: string;
      status?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("daily_field_logs")
        .insert([{ ...log, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["daily-field-logs", variables.project_id] });
      toast.success("Daily log created");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate key")) {
        toast.error("A log already exists for this date");
      } else {
        toast.error("Failed to create log: " + error.message);
      }
    },
  });
}

export function useUpdateFieldLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: { id: string; project_id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("daily_field_logs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["daily-field-logs", variables.project_id] });
      toast.success("Daily log updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update log: " + error.message);
    },
  });
}
