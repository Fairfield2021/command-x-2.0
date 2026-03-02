import { useState, useCallback } from "react";
import { Wrench, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { LinkLineItemsToSOV, type LinkableLineItem } from "@/components/shared/LinkLineItemsToSOV";
import { usePOLineItems, type PurchaseOrder } from "@/integrations/supabase/hooks/usePurchaseOrders";
import { formatCurrency } from "@/lib/utils";

interface ContractPOAccordionProps {
  projectPurchaseOrders: PurchaseOrder[];
  projectId: string;
}

function POAccordionContent({ po, projectId }: { po: PurchaseOrder; projectId: string }) {
  const queryClient = useQueryClient();
  const { data: lineItems = [], isLoading } = usePOLineItems(po.id, true);

  const handleSave = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sov_lines"] });
    queryClient.invalidateQueries({ queryKey: ["po_line_items", po.id] });
  }, [queryClient, po.id]);

  if (isLoading) {
    return <p className="py-4 text-sm text-muted-foreground">Loading line items…</p>;
  }

  if (lineItems.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No line items on this order.</p>;
  }

  const mapped: LinkableLineItem[] = lineItems.map((li) => ({
    id: li.id!,
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
    total: li.total,
    sov_line_id: li.sov_line_id ?? null,
  }));

  return (
    <LinkLineItemsToSOV
      lineItems={mapped}
      projectId={projectId}
      contextType="po"
      onSave={handleSave}
    />
  );
}

export function ContractPOAccordion({ projectPurchaseOrders, projectId }: ContractPOAccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  if (projectPurchaseOrders.length === 0) return null;

  // Sort: POs first, then WOs
  const sorted = [...projectPurchaseOrders].sort((a, b) => {
    if (a.order_type === b.order_type) return a.number.localeCompare(b.number);
    return a.order_type === "purchase_order" ? -1 : 1;
  });

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">Link PO / WO Line Items to SOV</h4>

      <Accordion
        type="multiple"
        value={openItems}
        onValueChange={setOpenItems}
        className="space-y-2"
      >
        {sorted.map((po) => {
          const isWO = po.order_type === "work_order";
          const Icon = isWO ? Wrench : Truck;
          const isOpen = openItems.includes(po.id);

          return (
            <AccordionItem
              key={po.id}
              value={po.id}
              className={`border rounded-lg px-4 ${isWO ? "border-purple-500/40" : "border-border/50"}`}
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-3 text-sm w-full">
                  <Icon className={`h-4 w-4 shrink-0 ${isWO ? "text-purple-500" : "text-primary"}`} />
                  <span className="font-medium">{po.number}</span>
                  {isWO && (
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-[10px] px-1.5 py-0">
                      WO
                    </Badge>
                  )}
                  <span className="text-muted-foreground truncate">{po.vendor_name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {po.status}
                  </Badge>
                  <span className="tabular-nums font-medium">{formatCurrency(po.total)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {isOpen && <POAccordionContent po={po} projectId={projectId} />}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
