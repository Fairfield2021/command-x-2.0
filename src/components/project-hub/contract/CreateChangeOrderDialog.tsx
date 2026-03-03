import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface CreateChangeOrderDialogProps {
  projectId: string;
  contractId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "",
    unit_price: 0,
  };
}

export function CreateChangeOrderDialog({
  projectId,
  contractId,
  open,
  onOpenChange,
}: CreateChangeOrderDialogProps) {
  const queryClient = useQueryClient();

  const [description, setDescription] = useState("");
  const [changeType, setChangeType] = useState<"additive" | "deductive">("additive");
  const [coValue, setCoValue] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()]);

  // Fetch project to get customer_id and customer_name
  const { data: project } = useQuery({
    queryKey: ["project-for-co", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("customer_id, customers(id, name)")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const lineItemsTotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0),
    [lineItems]
  );

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((li) => (li.id === id ? { ...li, [field]: value } : li))
      );
    },
    []
  );

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((li) => li.id !== id)));
  }, []);

  const resetForm = useCallback(() => {
    setDescription("");
    setChangeType("additive");
    setCoValue("");
    setSentTo("");
    setLineItems([createEmptyLineItem()]);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const customer = project?.customers as { id: string; name: string } | null;
      const numericCoValue = parseFloat(coValue) || 0;
      const subtotal = lineItemsTotal;

      const { data: co, error: coError } = await supabase
        .from("change_orders")
        .insert({
          project_id: projectId,
          contract_id: contractId,
          reason: description,
          number: "", // trigger overwrites
          customer_id: customer?.id ?? "",
          customer_name: customer?.name ?? "",
          change_type: changeType,
          co_value: numericCoValue,
          sent_to: sentTo || null,
          tax_rate: 0,
          subtotal,
          total: subtotal,
          status: "draft",
        })
        .select("id")
        .single();

      if (coError) throw coError;

      // Insert line items
      const validLines = lineItems.filter((li) => li.description.trim());
      if (validLines.length > 0) {
        const { error: liError } = await supabase
          .from("change_order_line_items")
          .insert(
            validLines.map((li, idx) => ({
              change_order_id: co.id,
              description: li.description,
              quantity: li.quantity,
              unit_price: li.unit_price,
              total: li.quantity * li.unit_price,
              sort_order: idx,
            }))
          );
        if (liError) throw liError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change_orders"] });
      queryClient.invalidateQueries({ queryKey: ["change-orders-by-contract"] });
      toast.success("Change Order created");
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create Change Order: ${err.message}`);
    },
  });

  const canSubmit = description.trim() && (parseFloat(coValue) || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Change Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="co-description">Description *</Label>
            <Input
              id="co-description"
              placeholder="Describe the scope change..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <RadioGroup
              value={changeType}
              onValueChange={(v) => setChangeType(v as "additive" | "deductive")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="additive" id="co-additive" />
                <Label htmlFor="co-additive" className="font-normal cursor-pointer">
                  Additive (+)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="deductive" id="co-deductive" />
                <Label htmlFor="co-deductive" className="font-normal cursor-pointer">
                  Deductive (-)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* CO Value */}
          <div className="space-y-1.5">
            <Label htmlFor="co-value">CO Value *</Label>
            <Input
              id="co-value"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={coValue}
              onChange={(e) => setCoValue(e.target.value)}
            />
          </div>

          {/* Sent To */}
          <div className="space-y-1.5">
            <Label htmlFor="co-sent-to">Sent To</Label>
            <Input
              id="co-sent-to"
              placeholder="Customer PM or field supervisor"
              value={sentTo}
              onChange={(e) => setSentTo(e.target.value)}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label>Line Items</Label>
            <div className="space-y-2">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-[1fr_60px_70px_100px_80px_32px] gap-2 items-center">
                  <Input
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Qty"
                    value={li.quantity || ""}
                    onChange={(e) =>
                      updateLineItem(li.id, "quantity", parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    placeholder="Unit"
                    value={li.unit}
                    onChange={(e) => updateLineItem(li.id, "unit", e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={li.unit_price || ""}
                    onChange={(e) =>
                      updateLineItem(li.id, "unit_price", parseFloat(e.target.value) || 0)
                    }
                  />
                  <span className="text-sm font-medium text-right">
                    {formatCurrency(li.quantity * li.unit_price)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={lineItems.length <= 1}
                    onClick={() => removeLineItem(li.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Line
            </Button>

            <div className="flex justify-end text-sm font-semibold pt-1 border-t border-border">
              Subtotal: {formatCurrency(lineItemsTotal)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create Change Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
