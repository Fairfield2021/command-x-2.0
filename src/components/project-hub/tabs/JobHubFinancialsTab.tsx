import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { FileText, Briefcase, Receipt, Plus } from "lucide-react";
import { format } from "date-fns";
import { ProjectFinancialSummary } from "@/components/project-hub/ProjectFinancialSummary";
import { ProjectLaborAllocation } from "@/components/project-hub/ProjectLaborAllocation";
import { ProjectChangeOrdersList } from "@/components/project-hub/ProjectChangeOrdersList";
import { ProjectTMTicketsList } from "@/components/project-hub/ProjectTMTicketsList";
import { ProjectPurchaseOrdersList } from "@/components/project-hub/ProjectPurchaseOrdersList";
import { ProjectVendorBillsList } from "@/components/project-hub/ProjectVendorBillsList";
import { ProjectTimeEntriesList } from "@/components/project-hub/ProjectTimeEntriesList";

interface JobHubFinancialsTabProps {
  projectId: string;
  financialData: any;
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
  financialData,
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

  const estimateColumns = [
    { key: "number", header: "Estimate #" },
    { key: "customer_name", header: "Customer" },
    { key: "status", header: "Status", render: (item: any) => <StatusBadge status={item.status} /> },
    { key: "total", header: "Total", render: (item: any) => <span className="font-medium">${item.total.toFixed(2)}</span> },
    { key: "created_at", header: "Created", render: (item: any) => format(new Date(item.created_at), "MMM dd, yyyy") },
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
  ];

  return (
    <div className="space-y-6">
      <ProjectFinancialSummary data={financialData} />
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
