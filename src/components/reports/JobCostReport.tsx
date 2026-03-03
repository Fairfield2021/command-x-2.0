import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Download, Loader2 } from "lucide-react";
import { useAllJobCostSummaries, JobCostSummary } from "@/hooks/useJobCostSummary";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SortKey = "project_name" | "total_contract_value" | "total_committed" | "total_expenses" | "total_invoiced" | "total_remaining" | "gross_profit" | "margin_percent" | "avg_percent_complete";

export function JobCostReport() {
  const { data: summaries, isLoading } = useAllJobCostSummaries();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("project_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    if (!summaries) return [];
    if (statusFilter === "all") return summaries;
    return summaries.filter((s) => s.contract_status?.toLowerCase() === statusFilter);
  }, [summaries, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => {
    const t = { contract: 0, committed: 0, expenses: 0, invoiced: 0, remaining: 0, profit: 0 };
    filtered.forEach((s) => {
      t.contract += s.total_contract_value ?? 0;
      t.committed += s.total_committed ?? 0;
      t.expenses += s.total_expenses ?? 0;
      t.invoiced += s.total_invoiced ?? 0;
      t.remaining += s.total_remaining ?? 0;
      t.profit += s.gross_profit ?? 0;
    });
    return { ...t, margin: t.contract ? (t.profit / t.contract) * 100 : 0, pctComplete: filtered.length ? filtered.reduce((a, s) => a + (s.avg_percent_complete ?? 0), 0) / filtered.length : 0 };
  }, [filtered]);

  const exportCsv = () => {
    const h = "Project Name,Contract Value,Committed,Expenses,Invoiced,Remaining,Profit,Margin %,% Complete";
    const rows = sorted.map((s) => [
      `"${s.project_name}"`, s.total_contract_value, s.total_committed, s.total_expenses, s.total_invoiced, s.total_remaining, s.gross_profit, s.margin_percent?.toFixed(1), s.avg_percent_complete?.toFixed(1),
    ].join(","));
    const blob = new Blob([[h, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "job-cost-report.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const kpis: { label: string; value: string; className?: string }[] = [
    { label: "Total Contract Value", value: formatCurrency(totals.contract) },
    { label: "Total Expenses", value: formatCurrency(totals.expenses), className: "text-destructive" },
    { label: "Total Invoiced", value: formatCurrency(totals.invoiced), className: "text-teal-600" },
    { label: "Total Gross Profit", value: formatCurrency(totals.profit), className: totals.profit >= 0 ? "text-success" : "text-destructive" },
  ];

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={cn("text-lg font-bold", k.className)}>{k.value}</p>
          </Card>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No projects match the selected filter</p></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader k="project_name">Project</SortHeader>
                <SortHeader k="total_contract_value">Contract Value</SortHeader>
                <SortHeader k="total_committed">Committed</SortHeader>
                <SortHeader k="total_expenses">Expenses</SortHeader>
                <SortHeader k="total_invoiced">Invoiced</SortHeader>
                <SortHeader k="total_remaining">Remaining</SortHeader>
                <SortHeader k="gross_profit">Profit</SortHeader>
                <SortHeader k="margin_percent">Margin %</SortHeader>
                <SortHeader k="avg_percent_complete">% Complete</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => (
                <TableRow key={s.project_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${s.project_id}#financials`)}>
                  <TableCell className="font-medium">{s.project_name}</TableCell>
                  <TableCell className="font-mono text-right">{formatCurrency(s.total_contract_value)}</TableCell>
                  <TableCell className="font-mono text-right text-amber-600">{formatCurrency(s.total_committed)}</TableCell>
                  <TableCell className="font-mono text-right text-destructive">{formatCurrency(s.total_expenses)}</TableCell>
                  <TableCell className="font-mono text-right text-teal-600">{formatCurrency(s.total_invoiced)}</TableCell>
                  <TableCell className="font-mono text-right">{formatCurrency(s.total_remaining)}</TableCell>
                  <TableCell className={cn("font-mono text-right", s.gross_profit >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(s.gross_profit)}</TableCell>
                  <TableCell className={cn("text-right font-mono", (s.margin_percent ?? 0) > 20 ? "text-success" : (s.margin_percent ?? 0) >= 10 ? "text-amber-600" : "text-destructive")}>{(s.margin_percent ?? 0).toFixed(1)}%</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={s.avg_percent_complete ?? 0} className="h-2 w-16" /><span className="text-xs text-muted-foreground">{(s.avg_percent_complete ?? 0).toFixed(0)}%</span></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell>Totals ({sorted.length})</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(totals.contract)}</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(totals.committed)}</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(totals.expenses)}</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(totals.invoiced)}</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(totals.remaining)}</TableCell>
                <TableCell className={cn("font-mono text-right", totals.profit >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(totals.profit)}</TableCell>
                <TableCell className="font-mono text-right">{totals.margin.toFixed(1)}%</TableCell>
                <TableCell><span className="text-xs">{totals.pctComplete.toFixed(0)}%</span></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}
