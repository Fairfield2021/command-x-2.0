import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Send, ThumbsUp, Trophy, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Estimate } from "@/integrations/supabase/hooks/useEstimates";
import type { Invoice } from "@/integrations/supabase/hooks/useInvoices";

interface PipelineStage {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  total: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface SalesPipelineProps {
  estimates: Estimate[];
  invoices: Invoice[];
}

export function SalesPipeline({ estimates, invoices }: SalesPipelineProps) {
  const navigate = useNavigate();

  const stages = useMemo<PipelineStage[]>(() => {
    const drafts = estimates.filter((e) => e.status === "draft");
    const pendingSent = estimates.filter(
      (e) => e.status === "pending" || e.status === "sent"
    );
    const approved = estimates.filter((e) => e.status === "approved");
    const won = invoices.filter((i) => i.status === "paid");
    const lost = estimates.filter((e) => e.status === "closed");

    return [
      {
        id: "lead",
        label: "Lead",
        icon: FileText,
        count: drafts.length,
        total: drafts.reduce((s, e) => s + e.total, 0),
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        borderColor: "border-muted-foreground/20",
      },
      {
        id: "estimate",
        label: "Estimate",
        icon: Send,
        count: pendingSent.length,
        total: pendingSent.reduce((s, e) => s + e.total, 0),
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
      },
      {
        id: "proposal",
        label: "Proposal",
        icon: ThumbsUp,
        count: approved.length,
        total: approved.reduce((s, e) => s + e.total, 0),
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
      },
      {
        id: "won",
        label: "Won",
        icon: Trophy,
        count: won.length,
        total: won.reduce((s, i) => s + i.total, 0),
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
      },
      {
        id: "lost",
        label: "Lost",
        icon: XCircle,
        count: lost.length,
        total: lost.reduce((s, e) => s + e.total, 0),
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
      },
    ];
  }, [estimates, invoices]);

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const grandTotal = stages.reduce((s, st) => s + st.total, 0);

  if (estimates.length === 0 && invoices.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No sales data yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Create your first estimate to start tracking your sales pipeline.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/estimates/new")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <FileText className="h-4 w-4" />
              New Estimate
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <Card>
        <CardContent className="flex items-center justify-between py-4 px-6">
          <div>
            <p className="text-sm text-muted-foreground">Pipeline Value</p>
            <p className="text-2xl font-bold">${grandTotal.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">
              {stages.reduce((s, st) => s + st.count, 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Funnel stages — horizontal on desktop, vertical on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const barPct = Math.round((stage.count / maxCount) * 100);

          return (
            <Card
              key={stage.id}
              className={cn(
                "relative overflow-hidden transition-shadow hover:shadow-md border",
                stage.borderColor
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", stage.bgColor)}>
                    <Icon className={cn("h-4 w-4", stage.color)} />
                  </div>
                  <span className="text-sm font-semibold">{stage.label}</span>
                </div>

                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {stage.count}
                  </p>
                  <p className={cn("text-sm font-medium", stage.color)}>
                    ${stage.total.toLocaleString()}
                  </p>
                </div>

                {/* Proportional bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", stage.bgColor)}
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: `var(--${stage.id === "won" ? "emerald" : ""}`, // fallback via className
                    }}
                  >
                    <div className={cn("h-full rounded-full", stage.color.replace("text-", "bg-"))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
