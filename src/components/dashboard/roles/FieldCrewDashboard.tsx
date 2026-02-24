import { useState } from "react";
import { Link } from "react-router-dom";
import { WelcomeStrip } from "../rows/WelcomeStrip";
import { useCurrentPersonnel } from "@/integrations/supabase/hooks/usePortal";
import { useTodaysSchedule } from "@/integrations/supabase/hooks/usePersonnelSchedules";
import { useClockEnabledProjects, useAllOpenClockEntries } from "@/integrations/supabase/hooks/useTimeClock";
import { ClockStatusCard } from "@/components/portal/ClockStatusCard";
import { DailyFieldLogForm } from "@/components/project-hub/field/DailyFieldLogForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, FileText, Users, CalendarDays, ArrowRight } from "lucide-react";

export function FieldCrewDashboard() {
  const { data: personnel, isLoading: personnelLoading } = useCurrentPersonnel();
  const personnelId = personnel?.id;
  const { data: todaySchedule, isLoading: scheduleLoading } = useTodaysSchedule(personnelId);
  const { data: clockProjects } = useClockEnabledProjects(personnelId);
  const { data: openEntries } = useAllOpenClockEntries(personnelId);

  const [logOpen, setLogOpen] = useState(false);
  const [logProjectId, setLogProjectId] = useState<string | null>(null);

  const isLoading = personnelLoading || scheduleLoading;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const activeEntry = openEntries?.[0];

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <WelcomeStrip />

      {/* Date header */}
      <div className="flex items-center gap-2 px-1">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{today}</span>
      </div>

      {/* Active clock status */}
      {personnelId && clockProjects && (
        <ClockStatusCard
          personnelId={personnelId}
          projects={(clockProjects || []).map((p: any) => ({
            id: p.id,
            name: p.project_name || p.name || "",
            time_clock_enabled: true,
            require_clock_location: false,
          }))}
          activeEntry={activeEntry || null}
        />
      )}

      {/* Today's Schedule */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : !todaySchedule?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assignments scheduled for today</p>
          ) : (
            todaySchedule.map((sched) => (
              <div
                key={sched.id}
                className="p-4 rounded-lg border border-border bg-secondary/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{sched.project?.name || "Project"}</p>
                  <Badge variant="secondary" className="text-xs">
                    {sched.scheduled_start_time?.slice(0, 5)}
                    {sched.scheduled_end_time ? ` – ${sched.scheduled_end_time.slice(0, 5)}` : ""}
                  </Badge>
                </div>
                {sched.notes && (
                  <p className="text-xs text-muted-foreground">{sched.notes}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Link to={`/projects/${sched.project_id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      <MapPin className="h-3 w-3 mr-1" /> Job Details
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => {
                      setLogProjectId(sched.project_id);
                      setLogOpen(true);
                    }}
                  >
                    <FileText className="h-3 w-3 mr-1" /> Daily Log
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Clock-enabled projects (quick access) */}
      {clockProjects && clockProjects.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              My Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clockProjects.map((proj: any) => (
              <Link
                key={proj.id}
                to={`/projects/${proj.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <span className="text-sm font-medium text-foreground truncate">{proj.project_name || proj.name}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daily Log Dialog */}
      {logProjectId && (
        <DailyFieldLogForm
          open={logOpen}
          onOpenChange={setLogOpen}
          projectId={logProjectId}
        />
      )}
    </div>
  );
}
