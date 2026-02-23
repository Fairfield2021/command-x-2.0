import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ClipboardList, Plus, Edit, Cloud, ShieldCheck } from "lucide-react";
import { useDailyFieldLogs, DailyFieldLog } from "@/integrations/supabase/hooks/useDailyFieldLogs";
import { DailyFieldLogForm } from "@/components/project-hub/field/DailyFieldLogForm";
import { FieldPhotoGallery } from "@/components/project-hub/field/FieldPhotoGallery";

interface JobHubFieldTabProps {
  projectId: string;
}

export function JobHubFieldTab({ projectId }: JobHubFieldTabProps) {
  const { data: logs, isLoading } = useDailyFieldLogs(projectId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyFieldLog | null>(null);

  const handleEdit = (log: DailyFieldLog) => {
    setEditingLog(log);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingLog(null);
    setIsFormOpen(true);
  };

  const getDisplayStatus = (status: string) => {
    const map: Record<string, string> = {
      draft: "draft",
      submitted: "pending",
      approved: "approved",
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Daily Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold">
              Daily Field Logs ({logs?.length || 0})
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New Log
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        ) : !logs || logs.length === 0 ? (
          <Card className="glass border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              No daily logs yet. Create a log to track field operations.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="glass border-border">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">
                          {new Date(log.log_date + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </h4>
                        <StatusBadge status={getDisplayStatus(log.status) as any} />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        {log.weather_conditions && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Cloud className="h-3.5 w-3.5" />
                            <span>{log.weather_conditions}</span>
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          Crew: <span className="font-medium text-foreground">{log.crew_count}</span>
                        </div>
                        {log.safety_incidents && (
                          <div className="flex items-center gap-1.5 text-destructive">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span className="truncate">{log.safety_incidents}</span>
                          </div>
                        )}
                      </div>

                      {log.work_performed && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{log.work_performed}</p>
                      )}
                    </div>
                    {log.status === "draft" && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(log)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Site Photos */}
      <FieldPhotoGallery projectId={projectId} />

      {/* Form Dialog */}
      {isFormOpen && (
        <DailyFieldLogForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          projectId={projectId}
          editingLog={editingLog}
        />
      )}
    </div>
  );
}
