import { useState } from "react";
import { Table2, BarChart3, Clock, AlertTriangle, FileEdit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SovStatusReport } from "@/components/reports/SovStatusReport";

type ReportKey = "sov" | "job-cost" | "commitments" | "ap-aging" | "change-orders";

const reportCards: { key: ReportKey; title: string; description: string; icon: React.ElementType }[] = [
  { key: "sov", title: "SOV Status", description: "Schedule of Values breakdown per project", icon: Table2 },
  { key: "job-cost", title: "Job Cost", description: "Contract value vs costs vs revenue vs profit", icon: BarChart3 },
  { key: "commitments", title: "Commitments", description: "Open POs and WOs across all projects", icon: Clock },
  { key: "ap-aging", title: "AP Aging", description: "Unpaid vendor bills with aging buckets", icon: AlertTriangle },
  { key: "change-orders", title: "Change Orders", description: "Addendums and deductions by project", icon: FileEdit },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Financial reports across all projects</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportCards.map((r) => {
          const Icon = r.icon;
          const isActive = activeReport === r.key;
          return (
            <Card
              key={r.key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isActive && "ring-2 ring-primary shadow-md"
              )}
              onClick={() => setActiveReport(isActive ? null : r.key)}
            >
              <CardHeader className="flex flex-row items-start gap-3 p-4">
                <div className={cn(
                  "rounded-md p-2",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">{r.title}</CardTitle>
                  <CardDescription className="text-xs">{r.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {activeReport === "sov" && <SovStatusReport />}
      {activeReport && activeReport !== "sov" && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Coming soon</p>
        </Card>
      )}
    </div>
  );
}
