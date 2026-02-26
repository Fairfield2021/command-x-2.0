import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUpdateContract, useDeleteContract, type Contract } from "@/hooks/useContracts";

interface ContractActionsProps {
  contract: Contract;
  onContractDeleted: () => void;
}

const ContractActions = ({ contract, onContractDeleted }: ContractActionsProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: contract.title,
    contract_number: contract.contract_number || "",
    scope_of_work: contract.scope_of_work || "",
    date_signed: contract.date_signed || "",
    original_value: contract.original_value,
  });

  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const handleActivate = () => {
    if (!contract.date_signed) {
      toast.error("Cannot activate: Date Signed is required. Edit the contract to set it.");
      return;
    }
    updateContract.mutate({ id: contract.id, status: "active" });
  };

  const handleComplete = () => {
    updateContract.mutate({ id: contract.id, status: "complete" });
  };

  const handleClose = () => {
    updateContract.mutate({ id: contract.id, status: "closed" });
  };

  const handleDelete = () => {
    deleteContract.mutate(contract.id, {
      onSuccess: () => onContractDeleted(),
    });
  };

  const handleEditOpen = () => {
    setEditForm({
      title: contract.title,
      contract_number: contract.contract_number || "",
      scope_of_work: contract.scope_of_work || "",
      date_signed: contract.date_signed || "",
      original_value: contract.original_value,
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    updateContract.mutate(
      {
        id: contract.id,
        title: editForm.title,
        contract_number: editForm.contract_number || null,
        scope_of_work: editForm.scope_of_work || null,
        date_signed: editForm.date_signed || null,
        original_value: editForm.original_value,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Transitions */}
      {contract.status === "draft" && (
        <Button onClick={handleActivate} disabled={updateContract.isPending}>
          <ShieldCheck className="h-4 w-4" />
          Activate Contract
        </Button>
      )}

      {contract.status === "active" && (
        <Button onClick={handleComplete} disabled={updateContract.isPending}>
          <CheckCircle2 className="h-4 w-4" />
          Mark Complete
        </Button>
      )}

      {/* Edit */}
      <Button variant="outline" onClick={handleEditOpen}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>

      {/* Close Contract */}
      {contract.status !== "closed" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={updateContract.isPending}>
              <XCircle className="h-4 w-4" />
              Close Contract
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close this contract?</AlertDialogTitle>
              <AlertDialogDescription>
                Closing a contract is a significant action. No further changes or invoicing will be expected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose}>Close Contract</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete (draft only) */}
      {contract.status === "draft" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleteContract.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this draft contract?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The contract and all associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-number">Contract Number</Label>
              <Input
                id="edit-number"
                value={editForm.contract_number}
                onChange={(e) => setEditForm((f) => ({ ...f, contract_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-scope">Scope of Work</Label>
              <Input
                id="edit-scope"
                value={editForm.scope_of_work}
                onChange={(e) => setEditForm((f) => ({ ...f, scope_of_work: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date Signed</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date_signed}
                onChange={(e) => setEditForm((f) => ({ ...f, date_signed: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-value">Original Value</Label>
              <Input
                id="edit-value"
                type="number"
                step="0.01"
                value={editForm.original_value}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, original_value: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditSave} disabled={updateContract.isPending || !editForm.title}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractActions;
