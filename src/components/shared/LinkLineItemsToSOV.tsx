import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Save, Link2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SovLinePicker } from "@/components/shared/SovLinePicker";
import { useContractsByProject } from "@/hooks/useContracts";
import { useSovLines, type SovLine } from "@/hooks/useSovLines";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

export interface LinkableLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sov_line_id: string | null;
}

interface LinkLineItemsToSOVProps {
  lineItems: LinkableLineItem[];
  projectId: string;
  contextType: "po" | "bill" | "invoice";
  onSave?: () => void;
  disabled?: boolean;
}

const tableNameMap = {
  po: "po_line_items",
  bill: "vendor_bill_line_items",
  invoice: "invoice_line_items",
} as const;

const existingTotalKey = {
  po: "committed_cost",
  bill: "billed_to_date",
  invoice: "invoiced_to_date",
} as const;

export function LinkLineItemsToSOV({
  lineItems,
  projectId,
  contextType,
  onSave,
  disabled = false,
}: LinkLineItemsToSOVProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localLinks, setLocalLinks] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const item of lineItems) {
      initial[item.id] = item.sov_line_id;
    }
    return initial;
  });

  const { data: contracts = [] } = useContractsByProject(projectId);
  const contract = contracts[0] ?? null;
  const { data: sovLines = [] } = useSovLines(contract?.id ?? null);

  const hasChanges = useMemo(() => {
    return lineItems.some((item) => localLinks[item.id] !== item.sov_line_id);
  }, [lineItems, localLinks]);

  const handleChange = useCallback((lineItemId: string, sovLineId: string | null) => {
    setLocalLinks((prev) => ({ ...prev, [lineItemId]: sovLineId }));
  }, []);

  const validateOvercommit = useCallback((): boolean => {
    // Group pending assignments by SOV line
    const sovLineAssignments = new Map<string, { adds: number; removes: number }>();

    for (const item of lineItems) {
      const oldSovId = item.sov_line_id;
      const newSovId = localLinks[item.id];

      if (oldSovId === newSovId) continue;

      // Remove from old SOV line
      if (oldSovId) {
        const entry = sovLineAssignments.get(oldSovId) ?? { adds: 0, removes: 0 };
        entry.removes += item.total;
        sovLineAssignments.set(oldSovId, entry);
      }

      // Add to new SOV line
      if (newSovId) {
        const entry = sovLineAssignments.get(newSovId) ?? { adds: 0, removes: 0 };
        entry.adds += item.total;
        sovLineAssignments.set(newSovId, entry);
      }
    }

    // Validate each affected SOV line
    const key = existingTotalKey[contextType];
    for (const [sovLineId, { adds, removes }] of sovLineAssignments) {
      const sovLine = sovLines.find((l) => l.id === sovLineId);
      if (!sovLine) continue;

      const existingTotal = sovLine[key] as number;
      const totalValue = sovLine.total_value ?? 0;
      const newTotal = existingTotal + adds - removes;

      if (newTotal > totalValue) {
        toast.warning(
          `SOV Line #${sovLine.line_number} would be overcommitted: ${formatCurrency(newTotal)} exceeds ${formatCurrency(totalValue)}`
        );
        return false;
      }
    }

    return true;
  }, [lineItems, localLinks, sovLines, contextType]);

  const handleSave = async () => {
    if (!validateOvercommit()) return;

    setIsSaving(true);
    try {
      const tableName = tableNameMap[contextType];
      const updates = lineItems
        .filter((item) => localLinks[item.id] !== item.sov_line_id)
        .map((item) => ({ lineItemId: item.id, sovLineId: localLinks[item.id] }));

      for (const { lineItemId, sovLineId } of updates) {
        const { error } = await supabase
          .from(tableName)
          .update({ sov_line_id: sovLineId })
          .eq("id", lineItemId);
        if (error) throw error;
      }

      toast.success(`${updates.length} SOV link(s) saved`);
      onSave?.();
    } catch (err: unknown) {
      toast.error(`Failed to save SOV links: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!contract) {
    return (
      <Card className="glass border-border/50 mt-6">
        <CardContent className="py-6 flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>No contract found for this project — SOV linking unavailable.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5 text-primary" />
              Link Line Items to SOV
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-28">Amount</TableHead>
                  <TableHead className="w-[420px]">SOV Line</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, idx) => (
                  <TableRow key={item.id} className="border-border/30">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{item.description}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell>
                      <SovLinePicker
                        contractId={contract.id}
                        value={localLinks[item.id] ?? null}
                        onChange={(sovLineId) => handleChange(item.id, sovLineId)}
                        contextType={contextType}
                        disabled={disabled}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || disabled}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving…" : "Save Links"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
