import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useProjects } from "@/integrations/supabase/hooks/useProjects";
import { useCustomers } from "@/integrations/supabase/hooks/useCustomers";
import { useEstimates } from "@/integrations/supabase/hooks/useEstimates";
import { useJobOrders } from "@/integrations/supabase/hooks/useJobOrders";
import { useInvoices } from "@/integrations/supabase/hooks/useInvoices";
import { useMilestonesByProject, useAddMilestone, useUpdateMilestone, useDeleteMilestone, Milestone } from "@/integrations/supabase/hooks/useMilestones";
import { useChangeOrdersByProject } from "@/integrations/supabase/hooks/useChangeOrders";
import { useTMTicketsByProject } from "@/integrations/supabase/hooks/useTMTickets";
import { usePurchaseOrders } from "@/integrations/supabase/hooks/usePurchaseOrders";
import { useVendorBills } from "@/integrations/supabase/hooks/useVendorBills";
import { useExpensesByProject } from "@/integrations/supabase/hooks/useExpenseReports";
import { useProjectTimeEntryCosts } from "@/integrations/supabase/hooks/useProjectLaborExpenses";
import { useAccountingCutover } from "@/hooks/useAccountingCutover";
import { useProjectSubledgerTotals } from "@/integrations/supabase/hooks/useProjectSubledgerTotals";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Download, LayoutDashboard, DollarSign, FileText, Users, Activity } from "lucide-react";
import { format } from "date-fns";
import { generateProjectReportPDF } from "@/utils/pdfExport";
import { AddTMTicketDialog } from "@/components/tm-tickets/AddTMTicketDialog";
import { CreateJobOrderDialog } from "@/components/job-orders/CreateJobOrderDialog";
import { CreateProjectInvoiceDialog } from "@/components/invoices/CreateProjectInvoiceDialog";

import { JobHubOverviewTab } from "@/components/project-hub/tabs/JobHubOverviewTab";
import { JobHubFinancialsTab } from "@/components/project-hub/tabs/JobHubFinancialsTab";
import { JobHubDocumentsTab } from "@/components/project-hub/tabs/JobHubDocumentsTab";
import { JobHubTeamTab } from "@/components/project-hub/tabs/JobHubTeamTab";
import { JobHubActivityTab } from "@/components/project-hub/tabs/JobHubActivityTab";

const VALID_TABS = ["overview", "financials", "documents", "team", "activity"] as const;
type TabValue = typeof VALID_TABS[number];

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // URL hash → active tab
  const hashTab = location.hash.replace("#", "") as TabValue;
  const initialTab = VALID_TABS.includes(hashTab) ? hashTab : "overview";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  useEffect(() => {
    const newHash = location.hash.replace("#", "") as TabValue;
    if (VALID_TABS.includes(newHash)) {
      setActiveTab(newHash);
    }
  }, [location.hash]);

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    navigate(`${location.pathname}#${tab}`, { replace: true });
  };

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: customers } = useCustomers();
  const { data: estimates } = useEstimates();
  const { data: jobOrders } = useJobOrders();
  const { data: invoices } = useInvoices();
  const { data: milestones } = useMilestonesByProject(id);
  const { data: changeOrders } = useChangeOrdersByProject(id);
  const { data: tmTickets } = useTMTicketsByProject(id);
  const { data: allPurchaseOrders } = usePurchaseOrders();
  const { data: projectVendorBills } = useVendorBills({ project_id: id });
  const { data: projectExpenses } = useExpensesByProject(id);
  const { data: timeEntryCosts } = useProjectTimeEntryCosts(id);
  const { cutoverDate, hasCutover, isLegacy } = useAccountingCutover();
  const { data: subledgerTotals } = useProjectSubledgerTotals(id, cutoverDate);

  const { data: supervisionBreakdown } = useQuery({
    queryKey: ["project-supervision-costs", id],
    queryFn: async () => {
      if (!id) return { supervisionCost: 0, fieldCost: 0 };
      const { data, error } = await supabase
        .from("time_entries")
        .select(`hours, hourly_rate, is_overhead, personnel:personnel_id (hourly_rate, title)`)
        .eq("project_id", id)
        .not("personnel_id", "is", null);
      if (error) throw error;

      let supervisionCost = 0;
      let fieldCost = 0;
      for (const entry of data || []) {
        if ((entry as any).is_overhead) continue;
        const p = entry.personnel as any;
        const rate = (entry as any).hourly_rate ?? p?.hourly_rate ?? 0;
        const cost = (entry.hours || 0) * rate;
        const title = (p?.title || "").toLowerCase();
        const isSupervision = title.includes("superintendent") || title.includes("supervisor") || title.includes("foreman");
        if (isSupervision) supervisionCost += cost;
        else fieldCost += cost;
      }
      return { supervisionCost, fieldCost };
    },
    enabled: !!id,
  });

  const addMilestone = useAddMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    status: "pending" as "pending" | "in-progress" | "completed" | "delayed",
    completion_percentage: 0,
  });
  const [isTMTicketDialogOpen, setIsTMTicketDialogOpen] = useState(false);
  const [isJobOrderDialogOpen, setIsJobOrderDialogOpen] = useState(false);
  const [isCreateInvoiceDialogOpen, setIsCreateInvoiceDialogOpen] = useState(false);

  const project = projects?.find((p) => p.id === id);
  const customer = customers?.find((c) => c.id === project?.customer_id);

  const projectPurchaseOrders = useMemo(
    () => allPurchaseOrders?.filter((po) => po.project_id === id) || [],
    [allPurchaseOrders, id]
  );

  const projectEstimates = useMemo(
    () => estimates?.filter((e) => e.project_id === id) || [],
    [estimates, id]
  );

  const projectJobOrders = useMemo(
    () => jobOrders?.filter((j) => j.project_id === id) || [],
    [jobOrders, id]
  );

  const projectInvoices = useMemo(() => {
    const jobOrderIds = projectJobOrders.map((j) => j.id);
    const changeOrderIds = (changeOrders || []).map((co) => co.id);
    return invoices?.filter((i) =>
      i.project_id === id ||
      (i.job_order_id && jobOrderIds.includes(i.job_order_id)) ||
      (i.change_order_id && changeOrderIds.includes(i.change_order_id))
    ) || [];
  }, [invoices, projectJobOrders, changeOrders, id]);

  const totals = useMemo(() => {
    const estimatesTotal = projectEstimates.reduce((sum, e) => sum + e.total, 0);
    const jobOrdersTotal = projectJobOrders.reduce((sum, j) => sum + j.total, 0);
    const invoicesTotal = projectInvoices.reduce((sum, i) => sum + i.total, 0);
    const paidTotal = projectInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
    return { estimatesTotal, jobOrdersTotal, invoicesTotal, paidTotal };
  }, [projectEstimates, projectJobOrders, projectInvoices]);

  const financialData = useMemo(() => {
    const originalContractValue = projectJobOrders.reduce((sum, j) => sum + j.total, 0);
    const changeOrdersTotal = (changeOrders || [])
      .filter((co) => co.status === "approved")
      .reduce((sum, co) => {
        const changeType = (co as any).change_type || 'additive';
        return changeType === 'deductive' ? sum - co.total : sum + co.total;
      }, 0);
    const tmTicketsTotal = (tmTickets || [])
      .filter((t) => ["approved", "signed", "invoiced"].includes(t.status))
      .reduce((sum, t) => {
        const changeType = (t as any).change_type || 'additive';
        return changeType === 'deductive' ? sum - t.total : sum + t.total;
      }, 0);
    const totalContractValue = originalContractValue + changeOrdersTotal + tmTicketsTotal;
    const totalPOValue = projectPurchaseOrders.reduce((sum, po) => sum + po.total + (po.total_addendum_amount || 0), 0);
    const totalVendorBilled = (projectVendorBills || []).reduce((sum, bill) => sum + bill.total, 0);
    const totalVendorPaid = (projectVendorBills || []).reduce((sum, bill) => sum + (bill.paid_amount || 0), 0);
    const totalInvoiced = projectInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPaid = projectInvoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
    const grossProfit = totalContractValue - totalPOValue;
    const grossMargin = totalContractValue > 0 ? (grossProfit / totalContractValue) * 100 : 0;
    const timeEntryLaborCost = timeEntryCosts?.totalLaborCost || 0;
    const personnelPaymentCost = projectExpenses?.personnel_total || 0;
    const totalLaborCost = timeEntryLaborCost + personnelPaymentCost;
    const totalOtherExpenses = 0;
    const totalAllCosts = totalPOValue + totalLaborCost;
    const netProfit = totalContractValue - totalAllCosts;
    const netMargin = totalContractValue > 0 ? (netProfit / totalContractValue) * 100 : 0;

    let dataSource: 'legacy' | 'current' | 'mixed' = 'current';
    if (hasCutover && project) {
      const projectDate = project.created_at || project.start_date;
      if (projectDate && isLegacy(projectDate)) {
        const hasSubledgerData = (subledgerTotals?.recognizedRevenue || 0) > 0 || (subledgerTotals?.actualCosts || 0) > 0;
        dataSource = hasSubledgerData ? 'mixed' : 'legacy';
      }
    }

    return {
      originalContractValue, changeOrdersTotal, tmTicketsTotal, totalContractValue,
      totalPOValue, totalVendorBilled, totalVendorPaid, totalInvoiced, totalPaid,
      grossProfit, grossMargin, totalLaborCost, totalOtherExpenses, netProfit, netMargin,
      supervisionLaborCost: supervisionBreakdown?.supervisionCost || 0,
      fieldLaborCost: supervisionBreakdown?.fieldCost || 0,
      recognizedRevenue: subledgerTotals?.recognizedRevenue || 0,
      actualCosts: subledgerTotals?.actualCosts || 0,
      committedCosts: totalPOValue,
      dataSource,
    };
  }, [projectJobOrders, changeOrders, tmTickets, projectPurchaseOrders, projectInvoices, projectVendorBills, projectExpenses, timeEntryCosts, supervisionBreakdown, hasCutover, project, isLegacy, subledgerTotals]);

  const overallCompletion = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      if (projectJobOrders.length === 0) return 0;
      const completedJobs = projectJobOrders.filter((j) => j.status === "completed").length;
      return Math.round((completedJobs / projectJobOrders.length) * 100);
    }
    const avgCompletion = milestones.reduce((sum, m) => sum + m.completion_percentage, 0) / milestones.length;
    return Math.round(avgCompletion);
  }, [milestones, projectJobOrders]);

  const handleExportPDF = () => {
    if (!project || !customer) return;
    generateProjectReportPDF({
      project: { name: project.name, status: project.status, start_date: project.start_date, end_date: project.end_date },
      customer: { name: customer.name, company: customer.company, email: customer.email, phone: customer.phone },
      estimates: projectEstimates.map((e) => ({ number: e.number, status: e.status, total: e.total, created_at: e.created_at })),
      jobOrders: projectJobOrders.map((j) => ({ number: j.number, status: j.status, total: j.total, start_date: j.start_date })),
      invoices: projectInvoices.map((i) => ({ number: i.number, status: i.status, total: i.total, due_date: i.due_date })),
      milestones: milestones?.map((m) => ({ title: m.title, status: m.status, due_date: m.due_date, completion_percentage: m.completion_percentage })) || [],
      totals,
      overallCompletion,
    });
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneFormData({
      title: milestone.title, description: milestone.description || "",
      due_date: milestone.due_date, status: milestone.status, completion_percentage: milestone.completion_percentage,
    });
    setIsMilestoneDialogOpen(true);
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    deleteMilestone.mutate(milestoneId);
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (editingMilestone) {
      await updateMilestone.mutateAsync({ id: editingMilestone.id, ...milestoneFormData });
    } else {
      await addMilestone.mutateAsync({ project_id: id, ...milestoneFormData });
    }
    setIsMilestoneDialogOpen(false);
    setEditingMilestone(null);
    setMilestoneFormData({ title: "", description: "", due_date: "", status: "pending", completion_percentage: 0 });
  };

  const openNewMilestoneDialog = () => {
    setEditingMilestone(null);
    setMilestoneFormData({ title: "", description: "", due_date: "", status: "pending", completion_percentage: 0 });
    setIsMilestoneDialogOpen(true);
  };

  if (!id) return <Navigate to="/projects" replace />;

  if (projectsLoading) {
    return (
      <PageLayout title="Loading..." description="">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!project) return <Navigate to="/projects" replace />;

  return (
    <PageLayout
      title={project.name}
      description="Project details and timeline"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="financials" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            Financials
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <JobHubOverviewTab
            project={project}
            customer={customer}
            milestones={milestones}
            overallCompletion={overallCompletion}
            projectJobOrders={projectJobOrders}
            onEditMilestone={handleEditMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            onAddMilestone={openNewMilestoneDialog}
          />
        </TabsContent>

        <TabsContent value="financials">
          <JobHubFinancialsTab
            projectId={id!}
            financialData={financialData}
            projectEstimates={projectEstimates}
            projectJobOrders={projectJobOrders}
            projectInvoices={projectInvoices}
            changeOrders={changeOrders || []}
            tmTickets={tmTickets || []}
            projectPurchaseOrders={projectPurchaseOrders}
            onAddTMTicket={() => setIsTMTicketDialogOpen(true)}
            onAddJobOrder={() => setIsJobOrderDialogOpen(true)}
            onAddInvoice={() => setIsCreateInvoiceDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="documents">
          <JobHubDocumentsTab projectId={id!} />
        </TabsContent>

        <TabsContent value="team">
          <JobHubTeamTab projectId={id!} projectName={project.name} />
        </TabsContent>

        <TabsContent value="activity">
          <JobHubActivityTab projectId={id!} />
        </TabsContent>
      </Tabs>

      {/* Milestone Dialog */}
      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingMilestone ? "Edit Milestone" : "Add New Milestone"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={milestoneFormData.title} onChange={(e) => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })} required className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={milestoneFormData.description} onChange={(e) => setMilestoneFormData({ ...milestoneFormData, description: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" type="date" value={milestoneFormData.due_date} onChange={(e) => setMilestoneFormData({ ...milestoneFormData, due_date: e.target.value })} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={milestoneFormData.status} onValueChange={(value: any) => setMilestoneFormData({ ...milestoneFormData, status: value })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="completion_percentage">Completion Percentage (%)</Label>
              <Input id="completion_percentage" type="number" min="0" max="100" value={milestoneFormData.completion_percentage} onChange={(e) => setMilestoneFormData({ ...milestoneFormData, completion_percentage: parseInt(e.target.value) || 0 })} required className="bg-secondary border-border" />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsMilestoneDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="glow">{editingMilestone ? "Save Changes" : "Add Milestone"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddTMTicketDialog open={isTMTicketDialogOpen} onOpenChange={setIsTMTicketDialogOpen} projectId={id} />

      {project && customer && (
        <CreateJobOrderDialog
          isOpen={isJobOrderDialogOpen}
          onClose={() => setIsJobOrderDialogOpen(false)}
          projectId={project.id}
          projectName={project.name}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      {project && customer && (
        <CreateProjectInvoiceDialog
          open={isCreateInvoiceDialogOpen}
          onOpenChange={setIsCreateInvoiceDialogOpen}
          projectId={project.id}
          projectName={project.name}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}
    </PageLayout>
  );
};

export default ProjectDetail;
