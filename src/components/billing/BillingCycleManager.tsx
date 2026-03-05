import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Plus, Send, CheckCircle, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useBillingCycles,
  useAddBillingCycle,
  useSubmitBillingCycle,
  useApproveBillingCycle,
} from "@/hooks/useBillingCycles";
import { formatCurrency } from "@/lib/utils";

interface BillingCycleManagerProps {
  projectId: string;
}

const statusColors: Record<string, string> = {
  draft: "secondary",
  submitted: "default",
  approved: "outline",
  paid: "default",
};

export function BillingCycleManager({ projectId }: BillingCycleManagerProps) {
  const { data: cycles = [], isLoading } = useBillingCycles(projectId);
  const addCycle = useAddBillingCycle();
  const submitCycle = useSubmitBillingCycle();
  const approveCycle = useApproveBillingCycle();

  const [createOpen, setCreateOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  const nextCycleNumber = useMemo(() => {
    if (cycles.length === 0) return 1;
    return Math.max(...cycles.map((c) => c.cycle_number)) + 1;
  }, [cycles]);

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) return;

    await addCycle.mutateAsync({
      project_id: projectId,
      cycle_number: nextCycleNumber,
      period_start: periodStart,
      period_end: periodEnd,
      status: "draft",
      total_billed: 0,
      total_retained: 0,
      invoice_id: null,
      notes: notes || null,
    });

    setCreateOpen(false);
    setPeriodStart("");
    setPeriodEnd("");
    setNotes("");
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Billing Cycles
        </CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Cycle
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : cycles.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No billing cycles yet. Create one to start tracking billing periods.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="w-16">#</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Retained</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id} className="border-border/30">
                  <TableCell className="font-medium">{cycle.cycle_number}</TableCell>
                  <TableCell>
                    {format(new Date(cycle.period_start), "MMM d")} –{" "}
                    {format(new Date(cycle.period_end), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[cycle.status] as any}>
                      {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(cycle.total_billed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(cycle.total_retained)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {cycle.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            submitCycle.mutate({ id: cycle.id, projectId })
                          }
                          disabled={submitCycle.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Submit
                        </Button>
                      )}
                      {cycle.status === "submitted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            approveCycle.mutate({ id: cycle.id, projectId })
                          }
                          disabled={approveCycle.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                      {cycle.invoice_id && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`/invoices/${cycle.invoice_id}`}>
                            <FileText className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Billing Cycle #{nextCycleNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Draw description, milestone notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!periodStart || !periodEnd || addCycle.isPending}
            >
              {addCycle.isPending ? "Creating..." : "Create Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
