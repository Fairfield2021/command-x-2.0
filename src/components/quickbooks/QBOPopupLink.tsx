import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuickBooksConfig } from "@/integrations/supabase/hooks/useQuickBooks";

type DocType = "invoice" | "estimate" | "purchase_order" | "bill";
type Variant = "create" | "edit";

const QBO_BASE_URL = "https://app.qbo.intuit.com/app";

const docTypePaths: Record<DocType, string> = {
  invoice: "invoice",
  estimate: "estimate",
  purchase_order: "purchaseorder",
  bill: "bill",
};

function buildQBOUrl(docType: DocType, txnId?: string): string {
  const path = docTypePaths[docType];
  if (txnId) {
    return `${QBO_BASE_URL}/${path}?txnId=${txnId}`;
  }
  return `${QBO_BASE_URL}/${path}`;
}

interface QBOPopupLinkProps {
  docType: DocType;
  /** QB transaction ID — required for 'edit' variant, omit for 'create' */
  txnId?: string;
  variant: Variant;
  /** Called ~2 seconds after the popup closes so the caller can refetch */
  onClose?: () => void;
  className?: string;
}

export function QBOPopupLink({
  docType,
  txnId,
  variant,
  onClose,
  className,
}: QBOPopupLinkProps) {
  const { data: qbConfig } = useQuickBooksConfig();
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isConnected = qbConfig?.is_connected === true;

  const handleClick = () => {
    if (!isConnected) return;

    const url = buildQBOUrl(docType, variant === "edit" ? txnId : undefined);

    // window.open MUST be called synchronously from the click handler
    const popup = window.open(url, "_blank", "width=1200,height=800,resizable=yes,scrollbars=yes");

    if (!popup) {
      toast.error("Popup blocked — please allow popups for this site, then try again.");
      return;
    }

    popupRef.current = popup;

    // Poll every 500ms to detect when the popup closes
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        popupRef.current = null;

        // Wait 2 seconds before calling onClose so QBO webhooks have time to fire
        setTimeout(() => {
          onClose?.();
        }, 2000);
      }
    }, 500);
  };

  if (variant === "create") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={!isConnected}
              className={className}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create in QBO
            </Button>
          </TooltipTrigger>
          {!isConnected && (
            <TooltipContent>
              <p>Connect QuickBooks to use this feature</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // edit variant — ghost icon button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={!isConnected}
            className={className}
            title="Edit in QuickBooks"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? "Edit in QuickBooks" : "Connect QuickBooks to use this feature"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
