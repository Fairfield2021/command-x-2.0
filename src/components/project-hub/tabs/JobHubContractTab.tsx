import { useState } from "react";
import { ScrollText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContractsByProject, useAddContract } from "@/hooks/useContracts";
import { useSovLines } from "@/hooks/useSovLines";
import { ContractHeader } from "@/components/project-hub/contract/ContractHeader";
import ContractActions from "@/components/project-hub/contract/ContractActions";
import SovTable from "@/components/project-hub/contract/SovTable";
import { ConvertEstimateToContract } from "@/components/project-hub/contract/ConvertEstimateToContract";
import type { Estimate } from "@/integrations/supabase/hooks/useEstimates";

interface JobHubContractTabProps {
  projectId: string;
  projectEstimates: Estimate[];
  projectName: string;
  customerId?: string;
}

export function JobHubContractTab({
  projectId,
  projectEstimates,
  projectName,
  customerId,
}: JobHubContractTabProps) {
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByProject(projectId);
  const addContract = useAddContract();

  // Use first contract for now (single-contract-per-project model)
  const contract = contracts[0] ?? null;

  const { data: sovLines = [], isLoading: sovLoading } = useSovLines(contract?.id ?? null);

  const handleCreateBlank = () => {
    addContract.mutate({
      project_id: projectId,
      customer_id: customerId ?? null,
      title: projectName,
      status: "draft",
      original_value: 0,
      addendum_value: 0,
      deduction_value: 0,
      contract_number: null,
      scope_of_work: null,
      date_signed: null,
      qb_estimate_id: null,
    });
  };

  if (contractsLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading contract…
      </div>
    );
  }

  // ── Empty state ──
  if (!contract) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No Contract Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Create a blank contract or convert an approved estimate below.
            </p>
            <Button
              className="mt-4"
              onClick={handleCreateBlank}
              disabled={addContract.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Blank Contract
            </Button>
          </CardContent>
        </Card>

        <ConvertEstimateToContract
          projectId={projectId}
          projectEstimates={projectEstimates}
          projectName={projectName}
        />
      </div>
    );
  }

  // ── Contract exists ──
  return (
    <div className="space-y-6">
      <ContractHeader contract={contract} customerName={null} />

      <ContractActions
        contract={contract}
        onContractDeleted={() => {
          // Query cache invalidation handled by hook
        }}
      />

      <SovTable
        contractId={contract.id}
        lines={sovLines}
        isLoading={sovLoading}
      />

      {/* Allow converting additional estimates as addendums */}
      <ConvertEstimateToContract
        projectId={projectId}
        projectEstimates={projectEstimates}
        projectName={projectName}
      />
    </div>
  );
}
