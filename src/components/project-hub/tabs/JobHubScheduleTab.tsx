import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Target, Plus, Edit, Trash2, CalendarDays, Clock, Users } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { usePersonnelSchedulesByProject } from "@/integrations/supabase/hooks/usePersonnelSchedules";
import type { Milestone } from "@/integrations/supabase/hooks/useMilestones";

interface JobHubScheduleTabProps {
  projectId: string;
  milestones: Milestone[] | undefined;
  onEditMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
  onAddMilestone: () => void;
}

export function JobHubScheduleTab({
  projectId,
  milestones,
  onEditMilestone,
  onDeleteMilestone,
  onAddMilestone,
}: JobHubScheduleTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { data: schedules } = usePersonnelSchedulesByProject(projectId);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const schedulesForDate = schedules?.filter(
    (s) => s.scheduled_date === selectedDateStr
  ) || [];

  // Dates that have schedules (for calendar highlighting)
  const scheduledDates = schedules?.map((s) => parseISO(s.scheduled_date)) || [];
  const milestoneDates = milestones?.map((m) => parseISO(m.due_date)) || [];

  return (
    <div className="space-y-6">
      {/* Milestones Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold">
              Milestones ({milestones?.length || 0})
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={onAddMilestone}>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        {!milestones || milestones.length === 0 ? (
          <Card className="glass border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              No milestones yet. Add milestones to track project progress.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <Card key={milestone.id} className="glass border-border">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{milestone.title}</h4>
                        <StatusBadge status={milestone.status} />
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(milestone.due_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEditMilestone(milestone)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteMilestone(milestone.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{milestone.completion_percentage}%</span>
                    </div>
                    <Progress value={milestone.completion_percentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Personnel Schedule Calendar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Personnel Schedule</h3>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass border-border">
            <CardContent className="pt-6 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  scheduled: scheduledDates,
                  milestone: milestoneDates,
                }}
                modifiersClassNames={{
                  scheduled: "bg-primary/20 text-primary font-bold",
                  milestone: "ring-2 ring-primary ring-offset-1",
                }}
              />
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="font-heading text-sm text-muted-foreground">
                {selectedDate ? format(selectedDate, "EEEE, MMM dd, yyyy") : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedulesForDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">No personnel scheduled for this date.</p>
              ) : (
                <div className="space-y-3">
                  {schedulesForDate.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {schedule.personnel?.first_name} {schedule.personnel?.last_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{schedule.scheduled_start_time}</span>
                          {schedule.scheduled_end_time && (
                            <span> – {schedule.scheduled_end_time}</span>
                          )}
                        </div>
                        {schedule.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Milestones due on selected date */}
              {selectedDate && milestones?.filter((m) =>
                isSameDay(parseISO(m.due_date), selectedDate)
              ).map((m) => (
                <div key={m.id} className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{m.title}</span>
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
