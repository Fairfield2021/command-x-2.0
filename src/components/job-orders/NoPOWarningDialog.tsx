import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface NoPOWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrderId: string;
}

export function NoPOWarningDialog({
  open,
  onOpenChange,
  jobOrderId,
}: NoPOWarningDialogProps) {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            No Purchase Order Found
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This job order cannot be moved to <strong>In Progress</strong> because it
              doesn't have any purchase orders yet.
            </p>
            <p className="text-muted-foreground">
              Create a purchase order first to authorize vendor spending, then
              change the status to In Progress.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => navigate(`/job-orders/${jobOrderId}`)}
          >
            Go to Job Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
