import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Briefcase, Receipt, Plus, Clock, AlertTriangle, DollarSign, Send, Wallet, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useJobCostSummary } from "@/hooks/useJobCostSummary";
import { ProjectLaborAllocation } from "@/components/project-hub/ProjectLaborAllocation";
import { ProjectChangeOrdersList } from "@/components/project-hub/ProjectChangeOrdersList";
import { ProjectTMTicketsList } from "@/components/project-hub/ProjectTMTicketsList";
import { ProjectPurchaseOrdersList } from "@/components/project-hub/ProjectPurchaseOrdersList";
import { ProjectVendorBillsList } from "@/components/project-hub/ProjectVendorBillsList";
import { ProjectTimeEntriesList } from "@/components/project-hub/ProjectTimeEntriesList";
import { QBOPopupLink } from "@/components/quickbooks/QBOPopupLink";
import { useQBMappingForList } from "@/integrations/supabase/hooks/useQBMappingForList";

interface JobHubFinancialsTabProps {
  projectId: string;
  projectEstimates: any[];
  projectJobOrders: any[];
  projectInvoices: any[];
  changeOrders: any[];
  tmTickets: any[];
  projectPurchaseOrders: any[];
  onAddTMTicket: () => void;
  onAddJobOrder: () => void;
  onAddInvoice: () => void;
}

export function JobHubFinancialsTab({
  projectId,
  projectEstimates,
  projectJobOrders,
  projectInvoices,
  changeOrders,
  tmTickets,
  projectPurchaseOrders,
  onAddTMTicket,
  onAddJobOrder,
  onAddInvoice,
}: JobHubFinancialsTabProps) {
  const navigate = useNavigate();
  const { data: summary } = useJobCostSummary(projectId);

  const estimateIds = useMemo(() => projectEstimates.map((e: any) => e.id), [projectEstimates]);
  const invoiceIds = useMemo(() => projectInvoices.map((i: any) => i.id), [projectInvoices]);
  const poIds = useMemo(() => projectPurchaseOrders.map((p: any) => p.id), [projectPurchaseOrders]);

  const estimateQBMap = useQBMappingForList(estimateIds, "estimate");
  const invoiceQBMap = useQBMappingForList(invoiceIds, "invoice");
  const poQBMap = useQBMappingForList(poIds, "purchase_order");

  const qboColumn = (map: Map<string, string>, docType: "estimate" | "invoice" | "purchase_order") => ({
    key: "_qbo",
    header: "",
    render: (item: any) => {
      const txnId = map.get(item.id);
      if (!txnId) return null;
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <QBOPopupLink docType={docType} txnId={txnId} variant="edit" />
        </div>
      );
    },
  });

  const estimateColumns = [
    { key: "number", header: "Estimate #" },
    { key: "customer_name", header: "Customer" },
    { key: "status", header: "Status", render: (item: any) => <StatusBadge status={item.status} /> },
    { key: "total", header: "Total", render: (item: any) => <span className="font-medium">${item.total.toFixed(2)}</span> },
    { key: "created_at", header: "Created", render: (item: any) => format(new Date(item.created_at), "MMM dd, yyyy") },
    ...(estimateQBMap.size > 0 ? [qboColumn(estimateQBMap, "estimate")] : []),
  ];

  const jobOrderColumns = [
    { key: "number", header: "Job Order #" },
    { key: "status", header: "Status", render: (item: any) => <StatusBadge status={item.status} /> },
    { key: "total", header: "Total", render: (item: any) => <span className="font-medium">${item.total.toFixed(2)}</span> },
    { key: "start_date", header: "Start Date", render: (item: any) => format(new Date(item.start_date), "MMM dd, yyyy") },
  ];

  const invoiceColumns = [
    { key: "number", header: "Invoice #" },
    { key: "status", header: "Status", render: (item: any) => <StatusBadge status={item.status} /> },
    { key: "total", header: "Amount", render: (item: any) => <span className="font-medium">${item.total.toFixed(2)}</span> },
    { key: "due_date", header: "Due Date", render: (item: any) => format(new Date(item.due_date), "MMM dd, yyyy") },
    ...(invoiceQBMap.size > 0 ? [qboColumn(invoiceQBMap, "invoice")] : []),
  ];

  const hasContract = summary?.contract_id != null;
  const s = summary;

  const kpiCards = [
    {
      label: "Contract Value",
      value: formatCurrency(s?.total_contract_value ?? 0),
      icon: FileText,
      colorClass: "text-foreground",
      subtitle: null,
    },
    {
      label: "Open Commitments",
      value: formatCurrency(s?.open_commitments ?? 0),
      icon: Clock,
      colorClass: "text-amber-600",
      subtitle: "POs/WOs issued, not yet paid",
    },
    {
      label: "Billed (AP)",
      value: formatCurrency(s?.total_billed ?? 0),
      icon: AlertTriangle,
      colorClass: "text-purple-600",
      subtitle: "Vendor bills received",
    },
    {
      label: "Expenses (Paid)",
      value: formatCurrency(s?.total_expenses ?? 0),
      icon: DollarSign,
      colorClass: "text-destructive",
      subtitle: "Actual cash out",
    },
    {
      label: "Invoiced (AR)",
      value: formatCurrency(s?.total_invoiced ?? 0),
      icon: Send,
      colorClass: "text-teal-600",
      subtitle: "Billed to customer",
    },
    {
      label: "Remaining",
      value: formatCurrency(s?.total_remaining ?? 0),
      icon: Wallet,
      colorClass: "text-foreground",
      subtitle: "Available to invoice",
    },
    {
      label: "Gross Profit",
      value: formatCurrency(s?.gross_profit ?? 0),
      icon: TrendingUp,
      colorClass: (s?.gross_profit ?? 0) >= 0 ? "text-green-600" : "text-destructive",
      subtitle: null,
      badge: s ? `${s.margin_percent.toFixed(1)}%` : "0.0%",
    },
  ];

  const completionPercent = s?.avg_percent_complete ?? 0;

  return (
    <div className="space-y-6">
      {/* Job Cost Summary KPI Cards */}
      <Card className="border-border">
        <CardContent className="p-[var(--density-card-padding)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className={`h-4 w-4 ${kpi.colorClass}`} />
                    <span className="text-xs font-medium">{kpi.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${kpi.colorClass}`}>
                      {kpi.value}
                    </span>
                    {"badge" in kpi && kpi.badge && (
                      <Badge variant={(s?.gross_profit ?? 0) >= 0 ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {kpi.badge}
                      </Badge>
                    )}
                  </div>
                  {kpi.subtitle && (
                    <p className="text-[10px] text-muted-foreground leading-tight">{kpi.subtitle}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall Completion</span>
              <span className="font-medium">{completionPercent.toFixed(0)}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>

          {!hasContract && (
            <p className="mt-3 text-xs text-muted-foreground italic">
              Create a contract to see financial tracking.
            </p>
          )}
        </CardContent>
      </Card>

      <ProjectLaborAllocation projectId={projectId} />

      {/* Estimates */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Estimates ({projectEstimates.length})</h3>
        </div>
        {projectEstimates.length === 0 ? (
          <Card className="glass border-border">
            <CardContent className="py-8 text-center text-muted-foreground">No estimates for this project yet.</CardContent>
          </Card>
        ) : (
          <DataTable data={projectEstimates} columns={estimateColumns} onRowClick={(item) => navigate(`/estimates/${item.id}`)} />
        )}
      </div>

      {/* Job Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Job Orders ({projectJobOrders.length})</h3>
          </div>
          <Button size="sm" onClick={onAddJobOrder}>
            <Plus className="h-4 w-4 mr-1" />
            Create JO
          </Button>
        </div>
        {projectJobOrders.length === 0 ? (
          <Card className="glass border-border">
            <CardContent className="py-8 text-center text-muted-foreground">No job orders for this project yet.</CardContent>
          </Card>
        ) : (
          <DataTable data={projectJobOrders} columns={jobOrderColumns} onRowClick={(item) => navigate(`/job-orders/${item.id}`)} />
        )}
      </div>

      {/* Invoices */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Invoices ({projectInvoices.length})</h3>
          </div>
          <Button size="sm" onClick={onAddInvoice}>
            <Plus className="h-4 w-4 mr-1" />
            Create Invoice
          </Button>
        </div>
        {projectInvoices.length === 0 ? (
          <Card className="glass border-border">
            <CardContent className="py-8 text-center text-muted-foreground">No invoices for this project yet.</CardContent>
          </Card>
        ) : (
          <DataTable data={projectInvoices} columns={invoiceColumns} onRowClick={(item) => navigate(`/invoices/${item.id}`)} />
        )}
      </div>

      <ProjectVendorBillsList projectId={projectId} />
      <ProjectChangeOrdersList changeOrders={changeOrders} projectId={projectId} onAddNew={() => navigate(`/change-orders/new?projectId=${projectId}`)} />
      <ProjectTMTicketsList tickets={tmTickets} projectId={projectId} onAddNew={onAddTMTicket} />
      <ProjectPurchaseOrdersList purchaseOrders={projectPurchaseOrders} projectId={projectId} />
      <ProjectTimeEntriesList projectId={projectId} />
    </div>
  );
}
