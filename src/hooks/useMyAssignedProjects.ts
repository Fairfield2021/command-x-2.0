import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AssignedProject {
  id: string;
  name: string;
  status: string;
  stage: string;
  start_date: string;
  end_date: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  customer_id: string;
}

export function useMyAssignedProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-assigned-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get project IDs from project_assignments
      const { data: assignments, error: assignError } = await supabase
        .from("project_assignments")
        .select("project_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (assignError) throw assignError;
      if (!assignments?.length) return [];

      const projectIds = assignments.map((a) => a.project_id);

      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, name, status, stage, start_date, end_date, address, city, state, customer_id")
        .in("id", projectIds)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return (projects || []) as AssignedProject[];
    },
    enabled: !!user?.id,
  });
}
