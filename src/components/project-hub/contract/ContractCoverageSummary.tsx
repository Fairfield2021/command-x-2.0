import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { SovLine } from "@/hooks/useSovLines";

interface ContractCoverageSummaryProps {
  sovLines: SovLine[];
}

export function ContractCoverageSummary({ sovLines }: ContractCoverageSummaryProps) {
  const totalValue = sovLines.reduce((sum, l) => sum + (l.total_value ?? 0), 0);
  const totalCommitted = sovLines.reduce((sum, l) => sum + l.committed_cost, 0);
  const totalBilled = sovLines.reduce((sum, l) => sum + l.billed_to_date, 0);
  const totalInvoiced = sovLines.reduce((sum, l) => sum + l.invoiced_to_date, 0);

  const committedPct = totalValue > 0 ? Math.min((totalCommitted / totalValue) * 100, 100) : 0;
  const billedPct = totalValue > 0 ? Math.min((totalBilled / totalValue) * 100, 100) : 0;
  const invoicedPct = totalValue > 0 ? Math.min((totalInvoiced / totalValue) * 100, 100) : 0;

  if (totalValue === 0) return null;

  return (
    <Card className="glass border-border/50">
      <CardContent className="py-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">SOV Coverage</h4>

        {/* Committed (POs) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Committed (POs)</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(totalCommitted)} / {formatCurrency(totalValue)}{" "}
              <span className="text-muted-foreground">({committedPct.toFixed(1)}%)</span>
            </span>
          </div>
          <Progress value={committedPct} className="h-2 bg-muted [&>div]:bg-amber-500" />
        </div>

        {/* Billed (Vendor Bills) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Billed (Vendor Bills)</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(totalBilled)} / {formatCurrency(totalValue)}{" "}
              <span className="text-muted-foreground">({billedPct.toFixed(1)}%)</span>
            </span>
          </div>
          <Progress value={billedPct} className="h-2 bg-muted [&>div]:bg-purple-500" />
        </div>

        {/* Invoiced (Customer Invoices) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Invoiced (Customer)</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(totalInvoiced)} / {formatCurrency(totalValue)}{" "}
              <span className="text-muted-foreground">({invoicedPct.toFixed(1)}%)</span>
            </span>
          </div>
          <Progress value={invoicedPct} className="h-2 bg-muted [&>div]:bg-teal-500" />
        </div>
      </CardContent>
    </Card>
  );
}
