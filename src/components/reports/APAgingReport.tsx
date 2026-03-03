import { useState, useMemo } from "react";
import { ArrowUpDown, Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

interface APAgingRow {
  bill_id: string;
  bill_number: string;
  vendor_name: string;
  project_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  bill_date: string;
  due_date: string;
  aging_bucket: string;
  days_past_due: number;
}

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;
type Bucket = typeof BUCKETS[number];

const BUCKET_CONFIG: Record<Bucket, { label: string; color: string; textClass: string; bgClass: string; badgeClass: string }> = {
  "current": { label: "Current", color: "hsl(142, 71%, 45%)", textClass: "text-green-600", bgClass: "bg-green-50 dark:bg-green-950/30", badgeClass: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800" },
  "1-30":    { label: "1-30 Days", color: "hsl(45, 93%, 47%)", textClass: "text-amber-600", bgClass: "bg-amber-50 dark:bg-amber-950/30", badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800" },
  "31-60":   { label: "31-60 Days", color: "hsl(24, 95%, 53%)", textClass: "text-orange-600", bgClass: "bg-orange-50 dark:bg-orange-950/30", badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800" },
  "61-90":   { label: "61-90 Days", color: "hsl(0, 72%, 60%)", textClass: "text-red-500", bgClass: "bg-red-50 dark:bg-red-950/30", badgeClass: "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800" },
  "90+":     { label: "90+ Days", color: "hsl(0, 72%, 45%)", textClass: "text-red-700", bgClass: "bg-red-100 dark:bg-red-950/50", badgeClass: "bg-red-200 text-red-800 border-red-300 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700" },
};

type SortKey = "bill_number" | "vendor_name" | "project_name" | "bill_date" | "due_date" | "total_amount" | "amount_paid" | "balance_due" | "days_past_due" | "aging_bucket";

export function APAgingReport() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["ap-aging-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_aging_summary")
        .select("*")
        .order("days_past_due", { ascending: false });
      if (error) throw error;
      return (data ?? []) as APAgingRow[];
    },
  });

  const [bucketFilter, setBucketFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("days_past_due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "days_past_due" ? "desc" : "asc"); }
  };

  const allRows = rows ?? [];
  const projects = useMemo(() => [...new Set(allRows.map((r) => r.project_name).filter(Boolean))].sort(), [allRows]);
  const vendors = useMemo(() => [...new Set(allRows.map((r) => r.vendor_name).filter(Boolean))].sort(), [allRows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (bucketFilter !== "all" && r.aging_bucket !== bucketFilter) return false;
      if (projectFilter !== "all" && r.project_name !== projectFilter) return false;
      if (vendorFilter !== "all" && r.vendor_name !== vendorFilter) return false;
      return true;
    });
  }, [allRows, bucketFilter, projectFilter, vendorFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const bucketSums = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const b of BUCKETS) sums[b] = 0;
    for (const r of filtered) {
      const b = r.aging_bucket as Bucket;
      if (b in sums) sums[b] += r.balance_due ?? 0;
    }
    return sums;
  }, [filtered]);

  const totalOutstanding = useMemo(() => filtered.reduce((s, r) => s + (r.balance_due ?? 0), 0), [filtered]);

  const chartData = useMemo(() => {
    const row: Record<string, number | string> = { name: "Aging" };
    for (const b of BUCKETS) row[b] = bucketSums[b];
    return [row];
  }, [bucketSums]);

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    for (const b of BUCKETS) cfg[b] = { label: BUCKET_CONFIG[b].label, color: BUCKET_CONFIG[b].color };
    return cfg;
  }, []);

  const exportCsv = () => {
    const h = "Bill #,Vendor,Project,Bill Date,Due Date,Total,Paid,Balance Due,Days Past Due,Aging";
    const csvRows = sorted.map((r) => [
      `"${r.bill_number}"`, `"${r.vendor_name}"`, `"${r.project_name}"`,
      r.bill_date?.slice(0, 10), r.due_date?.slice(0, 10),
      r.total_amount, r.amount_paid, r.balance_due, r.days_past_due, r.aging_bucket,
    ].join(","));
    const blob = new Blob([[h, ...csvRows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ap-aging-report.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const SortHeader = ({ k, children, className: cls }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn("cursor-pointer select-none", cls)} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bucketFilter} onValueChange={setBucketFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Aging" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buckets</SelectItem>
              {BUCKETS.map((b) => <SelectItem key={b} value={b}>{BUCKET_CONFIG[b].label}</SelectItem>)}
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

      {/* Aging bucket cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {BUCKETS.map((b) => (
          <Card key={b} className={cn("p-4", BUCKET_CONFIG[b].bgClass)}>
            <p className="text-xs text-muted-foreground">{BUCKET_CONFIG[b].label}</p>
            <p className={cn("text-lg font-bold", BUCKET_CONFIG[b].textClass)}>{formatCurrency(bucketSums[b])}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm font-bold">Total Outstanding: {formatCurrency(totalOutstanding)}</p>

      {/* Stacked bar chart */}
      {totalOutstanding > 0 && (
        <Card className="p-3">
          <ChartContainer config={chartConfig} className="h-[60px] w-full aspect-auto">
            <BarChart data={chartData} layout="vertical" barSize={32}>
              <XAxis type="number" hide />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), BUCKET_CONFIG[name as Bucket]?.label ?? name]}
              />
              {BUCKETS.map((b) => (
                <Bar key={b} dataKey={b} stackId="aging" fill={BUCKET_CONFIG[b].color} radius={0} />
              ))}
            </BarChart>
          </ChartContainer>
        </Card>
      )}

      {/* Detail table */}
      {sorted.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No unpaid bills match the selected filters</p></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader k="bill_number">Bill #</SortHeader>
                <SortHeader k="vendor_name">Vendor</SortHeader>
                <SortHeader k="project_name">Project</SortHeader>
                <SortHeader k="bill_date">Bill Date</SortHeader>
                <SortHeader k="due_date">Due Date</SortHeader>
                <SortHeader k="total_amount" className="text-right">Total</SortHeader>
                <SortHeader k="amount_paid" className="text-right">Paid</SortHeader>
                <SortHeader k="balance_due" className="text-right">Balance Due</SortHeader>
                <SortHeader k="days_past_due" className="text-right">Days Past Due</SortHeader>
                <SortHeader k="aging_bucket">Aging</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => {
                const cfg = BUCKET_CONFIG[r.aging_bucket as Bucket];
                return (
                  <TableRow key={r.bill_id}>
                    <TableCell className="font-medium">{r.bill_number}</TableCell>
                    <TableCell>{r.vendor_name}</TableCell>
                    <TableCell>{r.project_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.bill_date?.slice(0, 10)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.due_date?.slice(0, 10)}</TableCell>
                    <TableCell className="font-mono text-right">{formatCurrency(r.total_amount)}</TableCell>
                    <TableCell className="font-mono text-right">{formatCurrency(r.amount_paid)}</TableCell>
                    <TableCell className="font-mono text-right font-semibold">{formatCurrency(r.balance_due)}</TableCell>
                    <TableCell className="text-right">{r.days_past_due > 0 ? r.days_past_due : 0}</TableCell>
                    <TableCell>
                      {cfg && (
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", cfg.badgeClass)}>
                          {cfg.label}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={5}>Total ({sorted.length} bills)</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(sorted.reduce((s, r) => s + (r.total_amount ?? 0), 0))}</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(sorted.reduce((s, r) => s + (r.amount_paid ?? 0), 0))}</TableCell>
                <TableCell className="font-mono text-right">{formatCurrency(sorted.reduce((s, r) => s + (r.balance_due ?? 0), 0))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}