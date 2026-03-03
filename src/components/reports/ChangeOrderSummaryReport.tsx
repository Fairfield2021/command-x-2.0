import { useState, useMemo } from "react";
import { ArrowUpDown, Download, Loader2 } from "lucide-react";
import { useChangeOrders, ChangeOrder } from "@/integrations/supabase/hooks/useChangeOrders";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SortKey = "number" | "project_name" | "reason" | "change_type" | "co_value" | "status" | "created_at";

type COWithProject = ChangeOrder & { project: { id: string; name: string } };

export function ChangeOrderSummaryReport() {
  const { data: changeOrders, isLoading } = useChangeOrders();
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const projects = useMemo(() => {
    if (!changeOrders) return [];
    return [...new Set(changeOrders.map((co) => co.project?.name).filter(Boolean))].sort() as string[];
  }, [changeOrders]);

  const filtered = useMemo(() => {
    if (!changeOrders) return [] as COWithProject[];
    return (changeOrders as COWithProject[]).filter((co) => {
      if (statusFilter !== "all" && co.status !== statusFilter) return false;
      if (projectFilter !== "all" && co.project?.name !== projectFilter) return false;
      return true;
    });
  }, [changeOrders, statusFilter, projectFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "project_name") { av = a.project?.name ?? ""; bv = b.project?.name ?? ""; }
      else { av = (a as any)[sortKey] ?? ""; bv = (b as any)[sortKey] ?? ""; }
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const approved = filtered.filter((co) => co.status === "approved" || co.status === "invoiced");
    const additive = approved.filter((co) => co.change_type === "additive");
    const deductive = approved.filter((co) => co.change_type === "deductive");
    const addTotal = additive.reduce((s, co) => s + (co.co_value ?? co.total ?? 0), 0);
    const dedTotal = deductive.reduce((s, co) => s + (co.co_value ?? co.total ?? 0), 0);
    const pending = filtered.filter((co) => co.status === "pending_approval" || co.status === "pending_field_supervisor" || co.status === "pending_customer_pm");
    return {
      addCount: additive.length, addTotal,
      dedCount: deductive.length, dedTotal,
      net: addTotal - dedTotal,
      pendingCount: pending.length,
    };
  }, [filtered]);

  const exportCsv = () => {
    const h = "CO #,Project,Description,Type,Value,Status,Date";
    const rows = sorted.map((co) => [
      `"${co.number}"`, `"${co.project?.name ?? ""}"`, `"${co.reason}"`,
      co.change_type, co.co_value ?? co.total, co.status, co.created_at?.slice(0, 10),
    ].join(","));
    const blob = new Blob([[h, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "change-order-report.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      pending_approval: "bg-warning/10 text-warning",
      pending_field_supervisor: "bg-warning/10 text-warning",
      pending_customer_pm: "bg-warning/10 text-warning",
      approved: "bg-success/10 text-success",
      approved_pending_wo: "bg-success/10 text-success",
      invoiced: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
    };
    const labels: Record<string, string> = {
      draft: "Draft", pending_approval: "Pending", pending_field_supervisor: "Pending Field",
      pending_customer_pm: "Pending Customer", approved: "Approved", approved_pending_wo: "Approved (WO)",
      invoiced: "Invoiced", rejected: "Rejected",
    };
    return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", styles[status] ?? "bg-muted text-muted-foreground")}>{labels[status] ?? status}</span>;
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const kpiCards = [
    { label: "Total Addendums", value: `${kpis.addCount} — ${formatCurrency(kpis.addTotal)}`, className: "text-success" },
    { label: "Total Deductions", value: `${kpis.dedCount} — ${formatCurrency(kpis.dedTotal)}`, className: "text-destructive" },
    { label: "Net Change", value: formatCurrency(kpis.net), className: "font-bold" },
    { label: "Pending Approval", value: String(kpis.pendingCount), className: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={cn("text-lg font-bold", k.className)}>{k.value}</p>
          </Card>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No change orders match the selected filters</p></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader k="number">CO #</SortHeader>
                <SortHeader k="project_name">Project</SortHeader>
                <SortHeader k="reason">Description</SortHeader>
                <SortHeader k="change_type">Type</SortHeader>
                <SortHeader k="co_value">Value</SortHeader>
                <SortHeader k="status">Status</SortHeader>
                <SortHeader k="created_at">Date</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((co) => (
                <TableRow key={co.id}>
                  <TableCell className="font-medium">{co.number}</TableCell>
                  <TableCell>{co.project?.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{co.reason}</TableCell>
                  <TableCell>
                    {co.change_type === "additive" ? (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Additive</Badge>
                    ) : (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Deductive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-right">{formatCurrency(co.co_value ?? co.total)}</TableCell>
                  <TableCell>{statusBadge(co.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{co.created_at?.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={4}>Total ({sorted.length})</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(filtered.reduce((s, co) => s + (co.co_value ?? co.total ?? 0), 0))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}
