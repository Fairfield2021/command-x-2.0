import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";

export interface PersonnelAllocationSummary {
  personnelId: string;
  personnelName: string;
  hourlyRate: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalCost: number;
  projects: ProjectAllocation[];
}

export interface ProjectAllocation {
  projectId: string;
  projectName: string;
  customerName: string | null;
  hours: number;
  billableHours: number;
  cost: number;
  entryIds: string[];
}

/**
 * Fetches cross-project time allocation for all personnel within a date range.
 * Groups time by personnel → project to show distribution.
 */
export const useTimeAllocation = (weekDate: Date) => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["time-allocation", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id,
          personnel_id,
          project_id,
          hours,
          billable,
          hourly_rate,
          entry_date,
          personnel:personnel_id(first_name, last_name, hourly_rate, pay_rate),
          projects:project_id(
            name,
            customer_id,
            customers:customer_id(name)
          )
        `)
        .gte("entry_date", startStr)
        .lte("entry_date", endStr)
        .not("personnel_id", "is", null)
        .order("entry_date", { ascending: true });

      if (error) throw error;

      // Group by personnel
      const byPersonnel = new Map<string, PersonnelAllocationSummary>();

      for (const entry of data || []) {
        const pid = entry.personnel_id!;
        const personnel = entry.personnel as any;
        const project = entry.projects as any;
        const rate = Number(entry.hourly_rate || personnel?.pay_rate || personnel?.hourly_rate || 0);
        const hours = Number(entry.hours);

        if (!byPersonnel.has(pid)) {
          byPersonnel.set(pid, {
            personnelId: pid,
            personnelName: `${personnel?.first_name || "?"} ${personnel?.last_name || ""}`.trim(),
            hourlyRate: rate,
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            totalCost: 0,
            projects: [],
          });
        }

        const summary = byPersonnel.get(pid)!;
        summary.totalHours += hours;
        summary.totalCost += hours * rate;

        if (entry.billable) {
          summary.billableHours += hours;
        } else {
          summary.nonBillableHours += hours;
        }

        // Find or create project allocation
        let projAlloc = summary.projects.find((p) => p.projectId === entry.project_id);
        if (!projAlloc) {
          projAlloc = {
            projectId: entry.project_id,
            projectName: project?.name || "Unknown",
            customerName: project?.customers?.name || null,
            hours: 0,
            billableHours: 0,
            cost: 0,
            entryIds: [],
          };
          summary.projects.push(projAlloc);
        }
        projAlloc.hours += hours;
        projAlloc.cost += hours * rate;
        if (entry.billable) projAlloc.billableHours += hours;
        projAlloc.entryIds.push(entry.id);
      }

      // Sort by total hours descending
      const result = Array.from(byPersonnel.values())
        .sort((a, b) => b.totalHours - a.totalHours);

      // Sort each person's projects by hours
      for (const person of result) {
        person.projects.sort((a, b) => b.hours - a.hours);
      }

      return result;
    },
  });
};
