import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateFieldLog, useUpdateFieldLog, DailyFieldLog } from "@/integrations/supabase/hooks/useDailyFieldLogs";

interface DailyFieldLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editingLog?: DailyFieldLog | null;
}

export function DailyFieldLogForm({ open, onOpenChange, projectId, editingLog }: DailyFieldLogFormProps) {
  const createLog = useCreateFieldLog();
  const updateLog = useUpdateFieldLog();

  const [formData, setFormData] = useState({
    log_date: editingLog?.log_date || new Date().toISOString().split("T")[0],
    weather_conditions: editingLog?.weather_conditions || "",
    crew_count: editingLog?.crew_count || 0,
    work_performed: editingLog?.work_performed || "",
    safety_incidents: editingLog?.safety_incidents || "",
    delays: editingLog?.delays || "",
    notes: editingLog?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLog) {
      await updateLog.mutateAsync({ id: editingLog.id, project_id: projectId, ...formData });
    } else {
      await createLog.mutateAsync({ project_id: projectId, ...formData });
    }
    onOpenChange(false);
  };

  const set = (key: string, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editingLog ? "Edit Daily Log" : "New Daily Log"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={formData.log_date} onChange={(e) => set("log_date", e.target.value)} required className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Crew Count</Label>
              <Input type="number" min="0" value={formData.crew_count} onChange={(e) => set("crew_count", parseInt(e.target.value) || 0)} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Weather Conditions</Label>
            <Input value={formData.weather_conditions} onChange={(e) => set("weather_conditions", e.target.value)} placeholder="Clear, 75°F" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Work Performed</Label>
            <Textarea value={formData.work_performed} onChange={(e) => set("work_performed", e.target.value)} placeholder="Describe work completed today..." className="bg-secondary border-border" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Safety Incidents</Label>
            <Textarea value={formData.safety_incidents} onChange={(e) => set("safety_incidents", e.target.value)} placeholder="None" className="bg-secondary border-border" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Delays</Label>
            <Textarea value={formData.delays} onChange={(e) => set("delays", e.target.value)} placeholder="None" className="bg-secondary border-border" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => set("notes", e.target.value)} className="bg-secondary border-border" rows={2} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="glow" disabled={createLog.isPending || updateLog.isPending}>
              {editingLog ? "Save Changes" : "Create Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
