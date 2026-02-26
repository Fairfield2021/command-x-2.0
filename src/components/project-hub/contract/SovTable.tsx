import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell, TableFooter,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import {
  type SovLine,
  useAddSovLine, useUpdateSovLine, useDeleteSovLine,
} from "@/hooks/useSovLines";

interface SovTableProps {
  contractId: string;
  lines: SovLine[];
  isLoading: boolean;
}

interface LineFormData {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup: number;
  notes: string;
}

const emptyForm: LineFormData = {
  description: "",
  quantity: 1,
  unit: "",
  unit_price: 0,
  markup: 0,
  notes: "",
};

const SovTable: React.FC<SovTableProps> = ({ contractId, lines, isLoading }) => {
  const addLine = useAddSovLine();
  const updateLine = useUpdateSovLine();
  const deleteLine = useDeleteSovLine();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<SovLine | null>(null);
  const [form, setForm] = useState<LineFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<SovLine | null>(null);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => ({
        total_value: acc.total_value + (l.total_value ?? 0),
        committed_cost: acc.committed_cost + l.committed_cost,
        actual_cost: acc.actual_cost + l.actual_cost,
        billed_to_date: acc.billed_to_date + l.billed_to_date,
        paid_to_date: acc.paid_to_date + l.paid_to_date,
        balance_remaining: acc.balance_remaining + (l.balance_remaining ?? 0),
      }),
      { total_value: 0, committed_cost: 0, actual_cost: 0, billed_to_date: 0, paid_to_date: 0, balance_remaining: 0 },
    );
  }, [lines]);

  const openAdd = () => {
    setEditingLine(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (line: SovLine) => {
    setEditingLine(line);
    setForm({
      description: line.description,
      quantity: line.quantity,
      unit: line.unit ?? "",
      unit_price: line.unit_price,
      markup: line.markup,
      notes: line.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingLine) {
      updateLine.mutate({
        id: editingLine.id,
        contract_id: contractId,
        description: form.description,
        quantity: form.quantity,
        unit: form.unit || null,
        unit_price: form.unit_price,
        markup: form.markup,
        notes: form.notes || null,
      }, { onSuccess: () => setDialogOpen(false) });
    } else {
      const nextNum = lines.length > 0 ? Math.max(...lines.map((l) => l.line_number)) + 1 : 1;
      addLine.mutate({
        contract_id: contractId,
        line_number: nextNum,
        description: form.description,
        product_id: null,
        quantity: form.quantity,
        unit: form.unit || null,
        unit_price: form.unit_price,
        markup: form.markup,
        committed_cost: 0,
        actual_cost: 0,
        billed_to_date: 0,
        paid_to_date: 0,
        invoiced_to_date: 0,
        retention_held: 0,
        percent_complete: 0,
        change_order_id: null,
        is_addendum: false,
        notes: form.notes || null,
        sort_order: nextNum,
      }, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteLine.mutate(
      { id: deleteTarget.id, contractId },
      { onSuccess: () => setDeleteTarget(null) },
    );
  };

  const setField = (key: keyof LineFormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading SOV lines…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{lines.length} line{lines.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-[var(--density-radius-lg)] border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-12 text-xs">#</TableHead>
              <TableHead className="text-xs min-w-[180px]">Description</TableHead>
              <TableHead className="text-xs text-right w-16">Qty</TableHead>
              <TableHead className="text-xs w-16">Unit</TableHead>
              <TableHead className="text-xs text-right w-24">Unit Price</TableHead>
              <TableHead className="text-xs text-right w-20">Markup%</TableHead>
              <TableHead className="text-xs text-right w-28">Total Value</TableHead>
              <TableHead className="text-xs text-right w-28">Committed</TableHead>
              <TableHead className="text-xs text-right w-28">Actual</TableHead>
              <TableHead className="text-xs text-right w-28">Billed</TableHead>
              <TableHead className="text-xs text-right w-28">Paid</TableHead>
              <TableHead className="text-xs text-right w-28">Balance</TableHead>
              <TableHead className="text-xs text-right w-20">% Comp</TableHead>
              <TableHead className="text-xs w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground text-xs py-8">
                  No SOV lines yet. Click "Add Line" to get started.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => (
                <TableRow key={line.id} className="text-xs">
                  <TableCell className="font-mono text-muted-foreground">{line.line_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[200px]">{line.description}</span>
                      {line.is_addendum && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground">
                          Addendum
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{line.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unit ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(line.unit_price)}</TableCell>
                  <TableCell className="text-right font-mono">{line.markup}%</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(line.total_value)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(line.committed_cost)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(line.actual_cost)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(line.billed_to_date)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(line.paid_to_date)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(line.balance_remaining)}</TableCell>
                  <TableCell className="text-right font-mono">{line.percent_complete}%</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(line)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(line)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {lines.length > 0 && (
            <TableFooter>
              <TableRow className="text-xs font-semibold">
                <TableCell colSpan={6} className="text-right">Totals</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.total_value)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.committed_cost)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.actual_cost)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.billed_to_date)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.paid_to_date)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.balance_remaining)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLine ? "Edit SOV Line" : "Add SOV Line"}</DialogTitle>
            <DialogDescription>
              {editingLine ? "Update the line item details below." : "Enter the details for the new SOV line."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="sov-desc">Description *</Label>
              <Input id="sov-desc" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Line item description" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sov-qty">Quantity</Label>
                <Input id="sov-qty" type="number" min={0} value={form.quantity} onChange={(e) => setField("quantity", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sov-unit">Unit</Label>
                <Input id="sov-unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} placeholder="EA, SF, LF…" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sov-price">Unit Price</Label>
                <Input id="sov-price" type="number" min={0} step={0.01} value={form.unit_price} onChange={(e) => setField("unit_price", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sov-markup">Markup %</Label>
              <Input id="sov-markup" type="number" min={0} step={0.1} value={form.markup} onChange={(e) => setField("markup", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sov-notes">Notes</Label>
              <Input id="sov-notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.description || addLine.isPending || updateLine.isPending}>
              {editingLine ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOV Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete line #{deleteTarget?.line_number} "{deleteTarget?.description}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SovTable;
