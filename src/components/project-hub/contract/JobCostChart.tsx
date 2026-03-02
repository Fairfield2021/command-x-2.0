import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { JobCostSummary } from "@/hooks/useJobCostSummary";

interface JobCostChartProps {
  summary: JobCostSummary | null;
}

const COLORS = {
  expenses: "#16a34a",
  openCommitments: "#d97706",
  unbilledAP: "#9333ea",
  collected: "#0d9488",
  remaining: "#6b7280",
};

const chartConfig = {
  expenses: { label: "Expenses (Paid)", color: COLORS.expenses },
  openCommitments: { label: "Open Commitments", color: COLORS.openCommitments },
  unbilledAP: { label: "Unbilled AP", color: COLORS.unbilledAP },
  collected: { label: "Invoiced (AR)", color: COLORS.collected },
  remaining: { label: "Remaining to Invoice", color: COLORS.remaining },
};

const legendItems = [
  { key: "expenses", label: "Expenses (Paid)", color: COLORS.expenses },
  { key: "openCommitments", label: "Open Commitments", color: COLORS.openCommitments },
  { key: "unbilledAP", label: "Unbilled AP", color: COLORS.unbilledAP },
  { key: "collected", label: "Invoiced (AR)", color: COLORS.collected },
  { key: "remaining", label: "Remaining to Invoice", color: COLORS.remaining },
];

export function JobCostChart({ summary }: JobCostChartProps) {
  if (!summary || !summary.contract_id) return null;

  const s = summary;
  const unbilledAP = Math.max(0, s.total_billed - s.total_expenses);
  const domainMax = Math.max(s.total_contract_value, 1);

  const data = [
    {
      name: "Revenue",
      collected: s.total_invoiced,
      remaining: s.total_remaining,
      expenses: 0,
      openCommitments: 0,
      unbilledAP: 0,
    },
    {
      name: "Costs",
      expenses: s.total_expenses,
      openCommitments: s.open_commitments,
      unbilledAP: unbilledAP,
      collected: 0,
      remaining: 0,
    },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-[var(--density-card-padding)]">
        <h3 className="text-sm font-semibold text-foreground mb-3">Job Cost Breakdown</h3>

        <ChartContainer config={chartConfig} className="h-[120px] w-full aspect-auto">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 60 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, domainMax]}
              tickFormatter={(v: number) => formatCurrency(v)}
              fontSize={11}
            />
            <YAxis type="category" dataKey="name" fontSize={12} width={55} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const cfg = chartConfig[name as keyof typeof chartConfig];
                    return (
                      <span className="flex items-center gap-2">
                        <span>{cfg?.label ?? name}</span>
                        <span className="font-mono font-medium ml-auto">
                          {formatCurrency(Number(value))}
                        </span>
                      </span>
                    );
                  }}
                />
              }
            />
            {/* Cost segments */}
            <Bar dataKey="expenses" stackId="bar" fill={COLORS.expenses} radius={[0, 0, 0, 0]} />
            <Bar dataKey="openCommitments" stackId="bar" fill={COLORS.openCommitments} />
            <Bar dataKey="unbilledAP" stackId="bar" fill={COLORS.unbilledAP} />
            {/* Revenue segments */}
            <Bar dataKey="collected" stackId="bar" fill={COLORS.collected} />
            <Bar dataKey="remaining" stackId="bar" fill={COLORS.remaining} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {legendItems.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Unprofitable warning */}
        {s.gross_profit < 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            ⚠ This project is currently unprofitable
          </div>
        )}
      </CardContent>
    </Card>
  );
}
