import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllJobCostSummaries } from "@/hooks/useJobCostSummary";
import { StatCard } from "../StatCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  FileText,
  Clock,
  FileWarning,
  Send,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useMemo } from "react";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

export function FinancialOverview() {
  const navigate = useNavigate();

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_summary")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: jobSummaries } = useAllJobCostSummaries();

  const projectRows = useMemo(() => {
    if (!jobSummaries) return [];
    return jobSummaries
      .filter((p) => p.contract_status === "active")
      .sort((a, b) => (a.margin_percent ?? 0) - (b.margin_percent ?? 0))
      .slice(0, 10);
  }, [jobSummaries]);

  // Guard: hide if no data or no active projects
  if (!portfolio || portfolio.active_projects === 0) return null;

  const p = portfolio;
  const profitPositive = (p.total_gross_profit ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Financial Overview</h2>
        <Link
          to="/reports"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View Reports <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Active Projects"
          value={p.active_projects ?? 0}
          icon={Briefcase}
          compact
        />
        <StatCard
          title="Total Contract Value"
          value={fmt(p.total_contract_value ?? 0)}
          icon={FileText}
          compact
        />
        <StatCard
          title="Commitment Exposure"
          value={fmt(p.total_open_commitments ?? 0)}
          icon={Clock}
          change="Open POs/WOs not yet paid"
          changeType="neutral"
          compact
          textColor="hsl(var(--warning))"
        />
        <StatCard
          title="Accounts Payable"
          value={fmt(p.total_ap ?? 0)}
          icon={FileWarning}
          change="Unpaid vendor bills"
          changeType="neutral"
          compact
          textColor="hsl(280, 60%, 55%)"
        />
        <StatCard
          title="Total Invoiced"
          value={fmt(p.total_invoiced ?? 0)}
          icon={Send}
          compact
          textColor="hsl(170, 60%, 40%)"
        />
        <StatCard
          title="Portfolio Profit"
          value={fmt(p.total_gross_profit ?? 0)}
          icon={TrendingUp}
          change={
            p.overall_margin_percent != null
              ? `${Number(p.overall_margin_percent).toFixed(1)}% margin`
              : undefined
          }
          changeType={profitPositive ? "positive" : "negative"}
          compact
          textColor={profitPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
        />
      </div>

      {/* Project Profitability Table */}
      {projectRows.length > 0 && (
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Project Profitability
            </h3>
            <Link
              to="/reports"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="w-[100px]">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectRows.map((row) => {
                const margin = row.margin_percent ?? 0;
                const profitColor =
                  row.gross_profit >= 0 ? "text-success" : "text-destructive";
                const marginColor =
                  margin >= 20
                    ? "bg-success/15 text-success"
                    : margin >= 10
                    ? "bg-warning/15 text-warning"
                    : "bg-destructive/15 text-destructive";

                return (
                  <TableRow
                    key={row.project_id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/projects/${row.project_id}#financials`)
                    }
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {row.project_name}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(row.total_contract_value)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(row.total_expenses)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(row.total_invoiced)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs ${profitColor}`}
                    >
                      {fmt(row.gross_profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${marginColor}`}
                      >
                        {margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Progress
                        value={row.avg_percent_complete ?? 0}
                        className="h-1.5"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
