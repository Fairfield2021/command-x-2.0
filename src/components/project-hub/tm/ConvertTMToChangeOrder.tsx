import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { TMTicketData } from "./TMTicketCard";

interface ConvertTMToChangeOrderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TMTicketData;
  projectId: string;
  contractId: string | null;
  customerId: string;
  customerName: string;
  onConvert: () => void;
}

export function ConvertTMToChangeOrder({
  open,
  onOpenChange,
  ticket,
  projectId,
  contractId,
  customerId,
  customerName,
  onConvert,
}: ConvertTMToChangeOrderProps) {
  const [isConverting, setIsConverting] = useState(false);
  const queryClient = useQueryClient();

  const hoursLogged = ticket.hours_logged ?? 0;
  const hourlyRate = ticket.hourly_rate ?? 0;
  const materialsCost = ticket.materials_cost ?? 0;
  const laborTotal = hoursLogged * hourlyRate;
  const totalAmount = laborTotal + materialsCost;

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      // 1. Generate CO number
      const { data: coNumber, error: numErr } = await supabase
        .rpc("generate_change_order_number", { p_project_id: projectId });
      if (numErr) throw numErr;

      // 2. Insert change_orders record
      const { data: co, error: coErr } = await supabase
        .from("change_orders")
        .insert({
          project_id: projectId,
          contract_id: contractId,
          customer_id: customerId,
          customer_name: customerName,
          number: coNumber,
          reason: `T&M Conversion: ${ticket.description || ticket.ticket_number}`,
          change_type: "additive" as const,
          co_value: totalAmount,
          status: "draft" as const,
        })
        .select("id, number")
        .single();
      if (coErr) throw coErr;

      // 3. Insert line items
      const lineItems: { change_order_id: string; description: string; quantity: number; unit_price: number; total: number; sort_order: number }[] = [
        {
          change_order_id: co.id,
          description: `Labor - ${ticket.description || ticket.ticket_number}`,
          quantity: hoursLogged,
          unit_price: hourlyRate,
          total: laborTotal,
          sort_order: 1,
        },
      ];
      if (materialsCost > 0) {
        lineItems.push({
          change_order_id: co.id,
          description: `Materials - ${ticket.description || ticket.ticket_number}`,
          quantity: 1,
          unit_price: materialsCost,
          total: materialsCost,
          sort_order: 2,
        });
      }
      const { error: liErr } = await supabase
        .from("change_order_line_items")
        .insert(lineItems);
      if (liErr) throw liErr;

      // 4. Update tm_ticket status
      const { error: tmErr } = await supabase
        .from("tm_tickets")
        .update({ status: "converted_to_co", change_order_id: co.id } as Record<string, unknown>)
        .eq("id", ticket.id);
      if (tmErr) throw tmErr;

      // 5. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["change_orders"] });
      queryClient.invalidateQueries({ queryKey: ["change-orders-by-project"] });
      queryClient.invalidateQueries({ queryKey: ["tm-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tm-tickets-by-project"] });

      toast.success(`${ticket.ticket_number} converted to ${co.number}`);
      onOpenChange(false);
      onConvert();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to convert T&M ticket");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert {ticket.ticket_number} to Change Order</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This ticket has <strong>{hoursLogged} hours</strong> logged at{" "}
                <strong>{formatCurrency(hourlyRate)}/hr</strong>
                {materialsCost > 0 && (
                  <> plus <strong>{formatCurrency(materialsCost)}</strong> materials</>
                )}
                {" "}= <strong>{formatCurrency(totalAmount)}</strong> total.
              </p>
              <p>
                This will create a new Change Order with line items matching this T&M ticket's total.
                The CO will start as <strong>Draft</strong> and go through the normal approval workflow.
              </p>
              <p className="text-amber-500">
                The T&M ticket will be marked as converted and no further time can be logged.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConverting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConvert}
            disabled={isConverting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isConverting ? "Converting..." : "Convert to Change Order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
