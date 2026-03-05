import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { JobOrderForm } from "@/components/job-orders/JobOrderForm";
import { useJobOrder, useUpdateJobOrder } from "@/integrations/supabase/hooks/useJobOrders";
import { Loader2 } from "lucide-react";
import { NoPOWarningDialog } from "@/components/job-orders/NoPOWarningDialog";

const EditJobOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: jobOrder, isLoading } = useJobOrder(id || "");
  const updateJobOrder = useUpdateJobOrder();
  const [showNoPOWarning, setShowNoPOWarning] = useState(false);

  const handleSubmit = async (data: { jobOrder: Record<string, unknown>; lineItems: Record<string, unknown>[] }) => {
    if (!id) return;

    try {
      await updateJobOrder.mutateAsync({
        id,
        jobOrder: data.jobOrder,
        lineItems: data.lineItems,
      });

      navigate(`/job-orders/${id}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("NO_PO_NO_WORK")) {
        setShowNoPOWarning(true);
      }
    }
  };

  const handleCancel = () => {
    navigate(`/job-orders/${id}`);
  };

  if (isLoading) {
    return (
      <PageLayout title="Loading...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!jobOrder) {
    return (
      <PageLayout title="Job Order Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job order not found.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Edit ${jobOrder.number}`}
      description={`${jobOrder.customer_name} - ${jobOrder.project_name}`}
    >
      <JobOrderForm
        initialData={jobOrder}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateJobOrder.isPending}
      />
      {id && (
        <NoPOWarningDialog
          open={showNoPOWarning}
          onOpenChange={setShowNoPOWarning}
          jobOrderId={id}
        />
      )}
    </PageLayout>
  );
};

export default EditJobOrder;
