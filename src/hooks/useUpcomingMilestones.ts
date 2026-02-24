import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";

export interface UpcomingMilestone {
  id: string;
  project_id: string;
  title: string;
  due_date: string;
  status: string;
  completion_percentage: number;
  project_name?: string;
}

export function useUpcomingMilestones(projectIds: string[], days = 7) {
  const today = format(new Date(), "yyyy-MM-dd");
  const endDate = format(addDays(new Date(), days), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["upcoming-milestones", projectIds, days],
    queryFn: async () => {
      if (!projectIds.length) return [];

      const { data, error } = await supabase
        .from("milestones")
        .select("id, project_id, title, due_date, status, completion_percentage")
        .in("project_id", projectIds)
        .gte("due_date", today)
        .lte("due_date", endDate)
        .neq("status", "completed")
        .order("due_date");

      if (error) throw error;
      return (data || []) as UpcomingMilestone[];
    },
    enabled: projectIds.length > 0,
  });
}
