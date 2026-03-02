import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Briefcase, Receipt, Plus, Clock, AlertTriangle, DollarSign,
  Send, Wallet, TrendingUp, ChevronDown, CheckCircle, XCircle, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useJobCostSummary } from "@/hooks/useJobCostSummary";
import { ProjectLaborAllocation } from "@/components/project-hub/ProjectLaborAllocation";
import { JobCostChart } from "@/components/project-hub/contract/JobCostChart";
import { useTMTicketsByProject } from "@/integrations/supabase/hooks/useTMTickets";
import { CreateTMTicketDialog } from "@/components/project-hub/tm/CreateTMTicketDialog";
import { TMTicketCard } from "@/components/project-hub/tm/TMTicketCard";
import { ProjectPurchaseOrdersList } from "@/components/project-hub/ProjectPurchaseOrdersList";
import { ProjectVendorBillsList } from "@/components/project-hub/ProjectVendorBillsList";
import { ProjectTimeEntriesList } from "@/components/project-hub/ProjectTimeEntriesList";
import { CreateChangeOrderDialog } from "@/components/project-hub/contract/CreateChangeOrderDialog";
import { QBOPopupLink } from "@/components/quickbooks/QBOPopupLink";
import { useQBMappingForList } from "@/integrations/supabase/hooks/useQBMappingForList";
import {
  useChangeOrdersByProject,
  useApproveChangeOrder,
  useRejectChangeOrder,
  useUpdateChangeOrderStatus,
} from "@/integrations/supabase/hooks/useChangeOrders";
import { supabase } from "@/integrations/supabase/client";

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
  changeOrders: _changeOrders,
  tmTickets,
  projectPurchaseOrders,
  onAddTMTicket,
  onAddJobOrder,
  onAddInvoice,
}: JobHubFinancialsTabProps) {
  const navigate = useNavigate();
  const { data: summary } = useJobCostSummary(projectId);

  // Change order state
  const { data: changeOrders } = useChangeOrdersByProject(projectId);
  const approveChangeOrder = useApproveChangeOrder();
  const rejectChangeOrder = useRejectChangeOrder();
  const updateStatus = useUpdateChangeOrderStatus();
  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [approveConfirmCO, setApproveConfirmCO] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [coSectionOpen, setCoSectionOpen] = useState(true);
  const [tmSectionOpen, setTmSectionOpen] = useState(true);
  const [tmDialogOpen, setTmDialogOpen] = useState(false);

  // T&M tickets data
  const { data: tmTicketsData } = useTMTicketsByProject(projectId);

  const sortedTMTickets = useMemo(() => {
    if (!tmTicketsData) return [];
    const priority: Record<string, number> = { cap_reached: 0, open: 1, approved: 2, invoiced: 3, converted_to_co: 4 };
    return [...tmTicketsData].sort((a, b) => (priority[a.status] ?? 5) - (priority[b.status] ?? 5));
  }, [tmTicketsData]);

  const tmTotalHours = useMemo(() =>
    tmTicketsData?.reduce((sum, t) => sum + (Number((t as any).hours_logged) || 0), 0) ?? 0, [tmTicketsData]);
  const tmTotalAmount = useMemo(() =>
    tmTicketsData?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) ?? 0, [tmTicketsData]);
  const tmOpenCount = useMemo(() =>
    tmTicketsData?.filter(t => (t.status as string) === 'open' || (t.status as string) === 'draft').length ?? 0, [tmTicketsData]);
  const hasCapReached = useMemo(() =>
    tmTicketsData?.some(t => (t as any).status === 'cap_reached') ?? false, [tmTicketsData]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // CO summary calculations
  const totalAddendums = useMemo(() =>
    changeOrders?.filter((co: any) => co.change_type === "additive")
      .reduce((sum: number, co: any) => sum + (Number(co.co_value) || 0), 0) || 0,
    [changeOrders]);
  const totalDeductions = useMemo(() =>
    changeOrders?.filter((co: any) => co.change_type === "deductive")
      .reduce((sum: number, co: any) => sum + (Number(co.co_value) || 0), 0) || 0,
    [changeOrders]);
  const netChange = totalAddendums - totalDeductions;

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
    { label: "Contract Value", value: formatCurrency(s?.total_contract_value ?? 0), icon: FileText, colorClass: "text-foreground", subtitle: null },
    { label: "Open Commitments", value: formatCurrency(s?.open_commitments ?? 0), icon: Clock, colorClass: "text-amber-600", subtitle: "POs/WOs issued, not yet paid" },
    { label: "Billed (AP)", value: formatCurrency(s?.total_billed ?? 0), icon: AlertTriangle, colorClass: "text-purple-600", subtitle: "Vendor bills received" },
    { label: "Expenses (Paid)", value: formatCurrency(s?.total_expenses ?? 0), icon: DollarSign, colorClass: "text-destructive", subtitle: "Actual cash out" },
    { label: "Invoiced (AR)", value: formatCurrency(s?.total_invoiced ?? 0), icon: Send, colorClass: "text-teal-600", subtitle: "Billed to customer" },
    { label: "Remaining", value: formatCurrency(s?.total_remaining ?? 0), icon: Wallet, colorClass: "text-foreground", subtitle: "Available to invoice" },
    {
      label: "Gross Profit", value: formatCurrency(s?.gross_profit ?? 0), icon: TrendingUp,
      colorClass: (s?.gross_profit ?? 0) >= 0 ? "text-green-600" : "text-destructive",
      subtitle: null, badge: s ? `${s.margin_percent.toFixed(1)}%` : "0.0%",
    },
  ];

  const completionPercent = s?.avg_percent_complete ?? 0;

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "draft": return "bg-muted text-muted-foreground";
      case "pending_approval": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Draft";
      case "pending_approval": return "Pending Approval";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      default: return status;
    }
  };

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
                    <span className={`text-lg font-bold ${kpi.colorClass}`}>{kpi.value}</span>
                    {"badge" in kpi && kpi.badge && (
                      <Badge variant={(s?.gross_profit ?? 0) >= 0 ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {kpi.badge}
                      </Badge>
                    )}
                  </div>
                  {kpi.subtitle && <p className="text-[10px] text-muted-foreground leading-tight">{kpi.subtitle}</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall Completion</span>
              <span className="font-medium">{completionPercent.toFixed(0)}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>
          {!hasContract && (
            <p className="mt-3 text-xs text-muted-foreground italic">Create a contract to see financial tracking.</p>
          )}
        </CardContent>
      </Card>

      <JobCostChart summary={summary ?? null} />
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
          <Button size="sm" onClick={onAddJobOrder}><Plus className="h-4 w-4 mr-1" />Create JO</Button>
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
          <Button size="sm" onClick={onAddInvoice}><Plus className="h-4 w-4 mr-1" />Create Invoice</Button>
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

      {/* Change Orders — Enhanced Approval Workflow */}
      <Collapsible open={coSectionOpen} onOpenChange={setCoSectionOpen}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 group cursor-pointer">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-semibold">Change Orders</h3>
                <Badge variant="secondary" className="text-xs">{changeOrders?.length ?? 0}</Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${coSectionOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <Button size="sm" onClick={() => setCoDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />New Change Order
            </Button>
          </div>

          {/* Summary line */}
          {(changeOrders?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Addendums: <span className="font-medium text-green-600">+{formatCurrency(totalAddendums)}</span></span>
              <span>Deductions: <span className="font-medium text-destructive">-{formatCurrency(totalDeductions)}</span></span>
              <span>Net Change: <span className={`font-medium ${netChange >= 0 ? "text-green-600" : "text-destructive"}`}>{netChange >= 0 ? "+" : ""}{formatCurrency(netChange)}</span></span>
            </div>
          )}

          <CollapsibleContent>
            {!changeOrders || changeOrders.length === 0 ? (
              <Card className="glass border-border">
                <CardContent className="py-8 text-center text-muted-foreground">No change orders for this project yet.</CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {changeOrders.map((co: any) => {
                  const coValue = Number(co.co_value) || Number(co.total) || 0;
                  const isAdditive = co.change_type === "additive";
                  const lineCount = co.line_items?.length ?? 0;

                  return (
                    <Card key={co.id} className="border-border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/change-orders/${co.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{co.number}</span>
                              <Badge className={`text-[10px] px-1.5 py-0 ${isAdditive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                                {isAdditive ? "Additive" : "Deductive"}
                              </Badge>
                              <Badge className={`text-[10px] px-1.5 py-0 ${statusBadgeClass(co.status)}`}>
                                {statusLabel(co.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{co.reason}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className={`font-semibold ${isAdditive ? "text-green-600" : "text-destructive"}`}>
                                {isAdditive ? "+" : "-"}{formatCurrency(coValue)}
                              </span>
                              {co.sent_to && <span>Sent to: {co.sent_to}</span>}
                              <span>{format(new Date(co.created_at), "MMM dd, yyyy")}</span>
                              {co.status === "approved" && co.approved_at && (
                                <span className="text-green-600">Approved {format(new Date(co.approved_at), "MMM dd, yyyy")}</span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {co.status === "draft" && (
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => updateStatus.mutate({ id: co.id, status: "pending_approval" })}>
                                <Send className="h-3 w-3 mr-1" />Submit
                              </Button>
                            )}
                            {co.status === "pending_approval" && (
                              <>
                                <Button size="sm" variant="outline" className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                  onClick={() => setApproveConfirmCO(co)}>
                                  <CheckCircle className="h-3 w-3 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                  onClick={() => rejectChangeOrder.mutate({ changeOrderId: co.id, rejectedBy: currentUserId })}>
                                  <XCircle className="h-3 w-3 mr-1" />Reject
                                </Button>
                              </>
                            )}
                            {co.status === "rejected" && (
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => updateStatus.mutate({ id: co.id, status: "draft" })}>
                                <RotateCcw className="h-3 w-3 mr-1" />Reopen
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Approve confirmation dialog */}
      <AlertDialog open={!!approveConfirmCO} onOpenChange={(open) => { if (!open) setApproveConfirmCO(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Change Order {approveConfirmCO?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Approving this CO will add {approveConfirmCO?.line_items?.length ?? 0} new SOV line(s) and{" "}
              {approveConfirmCO?.change_type === "additive" ? "increase" : "decrease"} the contract value by{" "}
              {formatCurrency(Number(approveConfirmCO?.co_value) || 0)}. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (approveConfirmCO) {
                approveChangeOrder.mutate({ changeOrderId: approveConfirmCO.id, approvedBy: currentUserId });
                setApproveConfirmCO(null);
              }
            }}>
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateChangeOrderDialog
        projectId={projectId}
        contractId={summary?.contract_id ?? null}
        open={coDialogOpen}
        onOpenChange={setCoDialogOpen}
      />

      {/* T&M Tickets — Collapsible Section */}
      <Collapsible open={tmSectionOpen} onOpenChange={setTmSectionOpen}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 group cursor-pointer">
                <Receipt className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-semibold">T&M Tickets</h3>
                <Badge variant="secondary" className="text-xs">{tmTicketsData?.length ?? 0}</Badge>
                {hasCapReached && (
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" title="Cap reached on one or more tickets" />
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tmSectionOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <Button size="sm" onClick={() => setTmDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />New T&M Ticket
            </Button>
          </div>

          {(tmTicketsData?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Total Hours: <span className="font-medium text-foreground">{tmTotalHours.toFixed(1)}</span></span>
              <span>Total Amount: <span className="font-medium text-foreground">{formatCurrency(tmTotalAmount)}</span></span>
              <span>{tmOpenCount} ticket{tmOpenCount !== 1 ? "s" : ""} open</span>
            </div>
          )}

          <CollapsibleContent>
            {sortedTMTickets.length === 0 ? (
              <Card className="glass border-border">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No T&M tickets yet. Create one when unplanned work arises.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {sortedTMTickets.map((t) => (
                  <TMTicketCard
                    key={t.id}
                    ticket={t}
                    currentUserId={currentUserId}
                    projectId={projectId}
                    contractId={summary?.contract_id}
                    customerId={(t as any).customer_id}
                    customerName={(t as any).customer?.name ?? ""}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      <CreateTMTicketDialog
        projectId={projectId}
        contractId={summary?.contract_id ?? null}
        open={tmDialogOpen}
        onOpenChange={setTmDialogOpen}
      />
      <ProjectPurchaseOrdersList purchaseOrders={projectPurchaseOrders} projectId={projectId} />
      <ProjectTimeEntriesList projectId={projectId} />
    </div>
  );
}
