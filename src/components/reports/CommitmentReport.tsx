import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Download, Loader2, Truck, Wrench } from "lucide-react";
import { usePurchaseOrders, PurchaseOrder } from "@/integrations/supabase/hooks/usePurchaseOrders";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SortKey = "order_type" | "number" | "vendor_name" | "project_name" | "total" | "status" | "created_at";

const OPEN_STATUSES = new Set(["draft", "sent", "acknowledged", "in-progress", "pending_approval", "partially_billed"]);

export function CommitmentReport() {
  const { data: allOrders, isLoading } = usePurchaseOrders();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const openOrders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.filter((o) => OPEN_STATUSES.has(o.status));
  }, [allOrders]);

  const projects = useMemo(() => [...new Set(openOrders.map((o) => o.project_name))].sort(), [openOrders]);
  const vendors = useMemo(() => [...new Set(openOrders.map((o) => o.vendor_name))].sort(), [openOrders]);

  const filtered = useMemo(() => {
    return openOrders.filter((o) => {
      if (typeFilter !== "all" && o.order_type !== typeFilter) return false;
      if (projectFilter !== "all" && o.project_name !== projectFilter) return false;
      if (vendorFilter !== "all" && o.vendor_name !== vendorFilter) return false;
      return true;
    });
  }, [openOrders, typeFilter, projectFilter, vendorFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const pos = filtered.filter((o) => o.order_type === "purchase_order");
    const wos = filtered.filter((o) => o.order_type === "work_order");
    const poTotal = pos.reduce((s, o) => s + (o.total ?? 0), 0);
    const woTotal = wos.reduce((s, o) => s + (o.total ?? 0), 0);
    return { poCount: pos.length, poTotal, woCount: wos.length, woTotal, totalExposure: poTotal + woTotal };
  }, [filtered]);

  const totalAmount = useMemo(() => filtered.reduce((s, o) => s + (o.total ?? 0), 0), [filtered]);

  const exportCsv = () => {
    const h = "Type,Number,Vendor,Project,Amount,Status,Created Date";
    const rows = sorted.map((o) => [
      o.order_type === "purchase_order" ? "PO" : "WO",
      `"${o.number}"`, `"${o.vendor_name}"`, `"${o.project_name}"`, o.total, o.status, o.created_at?.slice(0, 10),
    ].join(","));
    const blob = new Blob([[h, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "commitment-report.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-primary/10 text-primary",
      acknowledged: "bg-primary/10 text-primary",
      "in-progress": "bg-primary/10 text-primary",
      pending_approval: "bg-warning/10 text-warning",
      partially_billed: "bg-warning/10 text-warning",
    };
    const labels: Record<string, string> = {
      draft: "Draft", sent: "Sent", acknowledged: "Acknowledged", "in-progress": "In Progress",
      pending_approval: "Pending Approval", partially_billed: "Partially Billed",
    };
    return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", styles[status] ?? "bg-muted text-muted-foreground")}>{labels[status] ?? status}</span>;
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const kpiCards = [
    { label: "Total Open POs", value: `${kpis.poCount} — ${formatCurrency(kpis.poTotal)}` },
    { label: "Total Open WOs", value: `${kpis.woCount} — ${formatCurrency(kpis.woTotal)}` },
    { label: "Total Commitment Exposure", value: formatCurrency(kpis.totalExposure), className: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase_order">POs Only</SelectItem>
              <SelectItem value="work_order">WOs Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Vendor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={cn("text-lg font-bold", k.className)}>{k.value}</p>
          </Card>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No open commitments match the selected filters</p></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader k="order_type">Type</SortHeader>
                <SortHeader k="number">Number</SortHeader>
                <SortHeader k="vendor_name">Vendor</SortHeader>
                <SortHeader k="project_name">Project</SortHeader>
                <SortHeader k="total">Amount</SortHeader>
                <SortHeader k="status">Status</SortHeader>
                <SortHeader k="created_at">Created</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchase-orders/${o.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {o.order_type === "purchase_order" ? (
                        <><Truck className="h-4 w-4 text-primary" /><Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">PO</Badge></>
                      ) : (
                        <><Wrench className="h-4 w-4 text-purple-600" /><Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">WO</Badge></>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{o.number}</TableCell>
                  <TableCell>{o.vendor_name}</TableCell>
                  <TableCell>{o.project_name}</TableCell>
                  <TableCell className="font-mono text-right">{formatCurrency(o.total)}</TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{o.created_at?.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={4}>Total ({sorted.length})</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(totalAmount)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}
