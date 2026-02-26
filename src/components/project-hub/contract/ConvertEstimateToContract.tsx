import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useContractsByProject, useAddContract } from "@/hooks/useContracts";
import { useBulkCreateSovLines } from "@/hooks/useSovLines";
import { toast } from "sonner";
import type {
  EstimateWithLineItems,
  EstimateLineItem,
} from "@/integrations/supabase/hooks/useEstimates";

interface ConvertEstimateToContractProps {
  projectId: string;
  projectEstimates: EstimateWithLineItems[];
  projectName: string;
}

export const ConvertEstimateToContract = ({
  projectId,
  projectEstimates,
  projectName,
}: ConvertEstimateToContractProps) => {
  const [selectedEstimate, setSelectedEstimate] =
    useState<EstimateWithLineItems | null>(null);
  const [contractTitle, setContractTitle] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const { data: existingContracts = [] } = useContractsByProject(projectId);
  const addContract = useAddContract();
  const bulkCreateSovLines = useBulkCreateSovLines();

  // Find which estimate IDs already have contracts linked via qb_estimate_id
  const convertedEstimateIds = new Set(
    existingContracts
      .map((c) => c.qb_estimate_id)
      .filter(Boolean) as string[]
  );

  // Only show approved/accepted estimates that haven't been converted yet
  const convertibleEstimates = projectEstimates.filter(
    (est) =>
      (est.status === "approved" || est.customer_approved) &&
      !convertedEstimateIds.has(est.id)
  );

  const openDialog = (estimate: EstimateWithLineItems) => {
    setSelectedEstimate(estimate);
    setContractTitle(projectName);
  };

  const closeDialog = () => {
    setSelectedEstimate(null);
    setContractTitle("");
    setIsConverting(false);
  };

  const handleConvert = async () => {
    if (!selectedEstimate) return;
    setIsConverting(true);

    try {
      // 1. Create the contract
      const contract = await addContract.mutateAsync({
        project_id: projectId,
        customer_id: selectedEstimate.customer_id,
        qb_estimate_id: selectedEstimate.id,
        contract_number: null,
        title: contractTitle || projectName,
        status: "draft",
        original_value: selectedEstimate.total,
        addendum_value: 0,
        deduction_value: 0,
        scope_of_work: selectedEstimate.notes || null,
        date_signed: null,
      });

      // 2. Create SOV lines from estimate line items
      const sovLines = selectedEstimate.line_items.map(
        (item: EstimateLineItem, index: number) => ({
          contract_id: contract.id,
          line_number: index + 1,
          description: item.description,
          product_id: item.product_id || null,
          quantity: item.quantity,
          unit: null,
          unit_price: item.unit_price,
          markup: item.markup,
          committed_cost: 0,
          actual_cost: 0,
          billed_to_date: 0,
          paid_to_date: 0,
          invoiced_to_date: 0,
          retention_held: 0,
          percent_complete: 0,
          change_order_id: null,
          is_addendum: false,
          notes: null,
          sort_order: index + 1,
        })
      );

      if (sovLines.length > 0) {
        await bulkCreateSovLines.mutateAsync(sovLines);
      }

      toast.success(
        `Contract created with ${sovLines.length} SOV line${sovLines.length !== 1 ? "s" : ""}`
      );
      closeDialog();
    } catch {
      // Error toasts handled by mutation hooks
      setIsConverting(false);
    }
  };

  if (convertibleEstimates.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {convertibleEstimates.map((estimate) => (
          <div
            key={estimate.id}
            className="flex items-center justify-between rounded-[var(--density-radius-md)] border bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {estimate.number}
              </span>
              <span className="text-sm text-muted-foreground">
                — {estimate.customer_name}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(estimate.total)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openDialog(estimate)}
            >
              <ArrowRightLeft className="mr-1 h-3 w-3" />
              Convert to Contract
            </Button>
          </div>
        ))}
      </div>

      <Dialog
        open={!!selectedEstimate}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Convert Estimate to Contract</DialogTitle>
            <DialogDescription>
              Create a new contract and populate SOV lines from estimate{" "}
              <strong>{selectedEstimate?.number}</strong> for{" "}
              <strong>{selectedEstimate?.customer_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract-title">Contract Title</Label>
              <Input
                id="contract-title"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="Enter contract title"
              />
            </div>

            <div className="space-y-2">
              <Label>SOV Lines Preview</Label>
              <div className="max-h-64 overflow-auto rounded-[var(--density-radius-md)] border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Markup %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEstimate?.line_items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.markup}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedEstimate?.line_items.length} line item
                {(selectedEstimate?.line_items.length ?? 0) !== 1 ? "s" : ""}{" "}
                • Total: {formatCurrency(selectedEstimate?.total)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={isConverting}>
              {isConverting ? "Creating…" : "Confirm & Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
