import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface CreateTMTicketDialogProps {
  projectId: string;
  contractId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTMTicketDialog({ projectId, contractId, open, onOpenChange }: CreateTMTicketDialogProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: "",
    hourlyRate: "",
    capHours: "10",
    materialsCost: "0",
  });

  const resetForm = () => setForm({ description: "", hourlyRate: "", capHours: "10", materialsCost: "0" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.hourlyRate) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tm_tickets")
        .insert({
          project_id: projectId,
          contract_id: contractId,
          description: form.description.trim(),
          hourly_rate: parseFloat(form.hourlyRate),
          cap_hours: parseInt(form.capHours) || 10,
          materials_cost: parseFloat(form.materialsCost) || 0,
          status: "open",
          ticket_number: "",
          work_date: new Date().toISOString().split("T")[0],
          customer_id: "",
          total: 0,
          subtotal: 0,
          tax_amount: 0,
          tax_rate: 0,
        })
        .select("ticket_number")
        .single();

      if (error) throw error;

      toast({ title: `T&M Ticket ${data.ticket_number || ""} created` });
      await queryClient.invalidateQueries({ queryKey: ["tm-tickets"] });
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: "Error creating ticket", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create T&M Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the unplanned work..."
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Hourly Rate *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.hourlyRate}
                onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                placeholder="85.00"
                required
              />
            </div>
            <div>
              <Label>Hour Cap</Label>
              <Input
                type="number"
                min="1"
                value={form.capHours}
                onChange={(e) => setForm((f) => ({ ...f, capHours: e.target.value }))}
              />
            </div>
            <div>
              <Label>Materials Est.</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.materialsCost}
                onChange={(e) => setForm((f) => ({ ...f, materialsCost: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
