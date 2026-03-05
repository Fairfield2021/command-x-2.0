import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Users, ArrowRightLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useTimeAllocation,
  type PersonnelAllocationSummary,
  type ProjectAllocation,
} from "@/hooks/useTimeAllocation";
import { useUpdateTimeEntry } from "@/integrations/supabase/hooks/useTimeEntries";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

interface TimeAllocationManagerProps {
  weekDate: Date;
}

export function TimeAllocationManager({ weekDate }: TimeAllocationManagerProps) {
  const { data: allocations = [], isLoading } = useTimeAllocation(weekDate);
  const [expandedPersonnel, setExpandedPersonnel] = useState<Set<string>>(new Set());
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<{
    person: PersonnelAllocationSummary;
    project: ProjectAllocation;
  } | null>(null);
  const [newProjectId, setNewProjectId] = useState("");

  const updateEntry = useUpdateTimeEntry();

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  // Fetch all active projects for reassignment
  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects-active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .in("status", ["active", "in-progress", "planning"])
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: reassignOpen,
  });

  // Summary stats
  const totals = useMemo(() => {
    let hours = 0;
    let billable = 0;
    let cost = 0;
    for (const a of allocations) {
      hours += a.totalHours;
      billable += a.billableHours;
      cost += a.totalCost;
    }
    return { hours, billable, cost, people: allocations.length };
  }, [allocations]);

  const toggleExpanded = (id: string) => {
    setExpandedPersonnel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReassign = (person: PersonnelAllocationSummary, project: ProjectAllocation) => {
    setReassignTarget({ person, project });
    setNewProjectId("");
    setReassignOpen(true);
  };

  const confirmReassign = async () => {
    if (!reassignTarget || !newProjectId) return;

    for (const entryId of reassignTarget.project.entryIds) {
      await updateEntry.mutateAsync({ id: entryId, project_id: newProjectId });
    }

    setReassignOpen(false);
    setReassignTarget(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading allocation data...
        </CardContent>
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No personnel time entries found for {weekLabel}.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Employee Time Allocation — {weekLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{totals.people}</p>
              <p className="text-xs text-muted-foreground">Personnel</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{totals.hours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                {totals.hours > 0 ? ((totals.billable / totals.hours) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Billable</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(totals.cost)}</p>
              <p className="text-xs text-muted-foreground">Labor Cost</p>
            </div>
          </div>

          {/* Personnel list */}
          <div className="space-y-2">
            {allocations.map((person) => {
              const isExpanded = expandedPersonnel.has(person.personnelId);
              const billablePercent =
                person.totalHours > 0
                  ? (person.billableHours / person.totalHours) * 100
                  : 0;

              return (
                <Collapsible
                  key={person.personnelId}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(person.personnelId)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{person.personnelName}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {person.projects.length} project{person.projects.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={billablePercent} className="h-1.5 flex-1 max-w-32" />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {billablePercent.toFixed(0)}% billable
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-medium tabular-nums">{person.totalHours.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(person.totalCost)}
                        </p>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-7 mt-1 mb-2">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/50">
                            <TableHead>Project</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Billable</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {person.projects.map((proj) => (
                            <TableRow key={proj.projectId} className="border-border/30">
                              <TableCell className="font-medium">{proj.projectName}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {proj.customerName || "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {proj.hours.toFixed(1)}h
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {proj.billableHours.toFixed(1)}h
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(proj.cost)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  title="Reassign to another project"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReassign(person, proj);
                                  }}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Time Entries</DialogTitle>
          </DialogHeader>
          {reassignTarget && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Move <span className="font-medium text-foreground">{reassignTarget.project.entryIds.length} entries</span>{" "}
                ({reassignTarget.project.hours.toFixed(1)}h) for{" "}
                <span className="font-medium text-foreground">{reassignTarget.person.personnelName}</span>{" "}
                from <span className="font-medium text-foreground">{reassignTarget.project.projectName}</span>{" "}
                to a different project.
              </p>
              <div className="space-y-2">
                <Label>New Project</Label>
                <Select value={newProjectId} onValueChange={setNewProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjects
                      .filter((p) => p.id !== reassignTarget.project.projectId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReassign}
              disabled={!newProjectId || updateEntry.isPending}
            >
              {updateEntry.isPending ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
