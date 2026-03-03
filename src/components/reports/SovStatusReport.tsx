import { useState, useMemo } from "react";
import { Download, ChevronsUpDown, Check } from "lucide-react";
import { useContracts, useContractsByProject } from "@/hooks/useContracts";
import { useSovLines } from "@/hooks/useSovLines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

export function SovStatusReport() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Get all contracts to build project list
  const { data: allContracts = [] } = useContracts();

  // Unique projects that have contracts
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    allContracts.forEach((c) => {
      if (c.project_id) map.set(c.project_id, c.title);
    });
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [allContracts]);

  // Fetch contracts for selected project, then SOV lines for first contract
  const { data: projectContracts = [] } = useContractsByProject(selectedProjectId);
  const activeContract = projectContracts[0] ?? null;
  const { data: sovLines = [], isLoading } = useSovLines(activeContract?.id ?? null);

  // Compute totals
  const totals = useMemo(() => {
    const t = { totalValue: 0, committed: 0, expenses: 0, invoiced: 0, remaining: 0, pctSum: 0 };
    sovLines.forEach((l) => {
      t.totalValue += l.total_value ?? 0;
      t.committed += l.committed_cost;
      t.expenses += l.actual_cost;
      t.invoiced += l.invoiced_to_date;
      t.remaining += l.balance_remaining ?? 0;
      t.pctSum += l.percent_complete;
    });
    return { ...t, avgPct: sovLines.length ? t.pctSum / sovLines.length : 0 };
  }, [sovLines]);

  const selectedLabel = projectOptions.find((p) => p.id === selectedProjectId)?.title ?? "Select a project";

  const exportCsv = () => {
    const header = "Line #,Description,Total Value,Committed,Expenses,Invoiced,Remaining,% Complete";
    const rows = sovLines.map((l) =>
      [l.line_number, `"${(l.description ?? "").replace(/"/g, '""')}"`, l.total_value ?? 0, l.committed_cost, l.actual_cost, l.invoiced_to_date, l.balance_remaining ?? 0, l.percent_complete].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sov-status-${selectedProjectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="text-lg">SOV Status Report</CardTitle>
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[260px] justify-between text-sm">
                <span className="truncate">{selectedLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                  <CommandEmpty>No projects with contracts</CommandEmpty>
                  <CommandGroup>
                    {projectOptions.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.title}
                        onSelect={() => {
                          setSelectedProjectId(p.id);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")} />
                        {p.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {sovLines.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!selectedProjectId && (
          <p className="text-center text-muted-foreground py-12">Select a project to view its SOV status</p>
        )}

        {selectedProjectId && isLoading && (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        )}

        {selectedProjectId && !isLoading && sovLines.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No SOV lines found for this project</p>
        )}

        {sovLines.length > 0 && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Contract Value", value: fmt(totals.totalValue) },
                { label: "Total Committed", value: fmt(totals.committed), className: "text-amber-600" },
                { label: "Total Invoiced", value: fmt(totals.invoiced), className: "text-teal-600" },
                { label: "Balance Remaining", value: fmt(totals.remaining) },
                { label: "Avg % Complete", value: pct(totals.avgPct) },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={cn("text-lg font-semibold", kpi.className)}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Line #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-20">% Complete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sovLines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.line_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{l.description}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(l.total_value ?? 0)}</TableCell>
                      <TableCell className="text-right text-amber-600">{fmt(l.committed_cost)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(l.actual_cost)}</TableCell>
                      <TableCell className="text-right text-teal-600">{fmt(l.invoiced_to_date)}</TableCell>
                      <TableCell className={cn("text-right", (l.balance_remaining ?? 0) < 0 && "text-destructive")}>
                        {fmt(l.balance_remaining ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">{pct(l.percent_complete)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell className="text-right">{fmt(totals.totalValue)}</TableCell>
                    <TableCell className="text-right text-amber-600">{fmt(totals.committed)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(totals.expenses)}</TableCell>
                    <TableCell className="text-right text-teal-600">{fmt(totals.invoiced)}</TableCell>
                    <TableCell className="text-right">{fmt(totals.remaining)}</TableCell>
                    <TableCell className="text-right">{pct(totals.avgPct)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
