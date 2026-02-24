import { Link } from "react-router-dom";
import { WelcomeStrip } from "../rows/WelcomeStrip";
import { useMyAssignedProjects } from "@/hooks/useMyAssignedProjects";
import { useUpcomingMilestones } from "@/hooks/useUpcomingMilestones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CalendarClock, ArrowRight, AlertCircle } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

function statusColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-500";
    case "on-hold": return "bg-yellow-500";
    case "completed": return "bg-muted-foreground";
    default: return "bg-muted-foreground";
  }
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "quote": return "Quote";
    case "task_order": return "Task Order";
    case "active": return "Active";
    case "complete": return "Complete";
    case "canceled": return "Canceled";
    default: return stage;
  }
}

function dueDateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

export function PMDashboard() {
  const { data: projects, isLoading: projLoading } = useMyAssignedProjects();
  const projectIds = (projects || []).map((p) => p.id);
  const { data: milestones, isLoading: msLoading } = useUpcomingMilestones(projectIds);

  const activeProjects = (projects || []).filter((p) => p.status !== "completed");

  return (
    <div className="space-y-6">
      <WelcomeStrip />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{activeProjects.length}</p>
            <p className="text-xs text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{(milestones || []).length}</p>
            <p className="text-xs text-muted-foreground">Upcoming Milestones</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">
              {activeProjects.filter((p) => p.stage === "active").length}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">
              {activeProjects.filter((p) => p.status === "on-hold").length}
            </p>
            <p className="text-xs text-muted-foreground">On Hold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Jobs */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              My Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active jobs assigned</p>
            ) : (
              activeProjects.slice(0, 8).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusColor(project.status))} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                      {project.address && (
                        <p className="text-xs text-muted-foreground truncate">{project.address}, {project.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{stageLabel(project.stage)}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Milestones — Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {msLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : !milestones?.length ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No milestones due this week</p>
              </div>
            ) : (
              milestones.map((ms) => {
                const project = (projects || []).find((p) => p.id === ms.project_id);
                return (
                  <Link
                    key={ms.id}
                    to={`/projects/${ms.project_id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ms.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{project?.name || "Project"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">{dueDateLabel(ms.due_date)}</Badge>
                      <span className="text-xs text-muted-foreground">{ms.completion_percentage}%</span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
