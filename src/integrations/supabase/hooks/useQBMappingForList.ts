import { useQuery } from "@tanstack/react-query";
import { supabase } from "../client";
import { useQuickBooksConfig } from "./useQuickBooks";

type DocType = "invoice" | "estimate" | "purchase_order" | "bill";

const tableMap: Record<DocType, string> = {
  invoice: "quickbooks_invoice_mappings",
  estimate: "quickbooks_estimate_mappings",
  purchase_order: "quickbooks_po_mappings",
  bill: "quickbooks_bill_mappings",
};

const entityIdColumn: Record<DocType, string> = {
  invoice: "invoice_id",
  estimate: "estimate_id",
  purchase_order: "purchase_order_id",
  bill: "bill_id",
};

const qbIdColumn: Record<DocType, string> = {
  invoice: "quickbooks_invoice_id",
  estimate: "quickbooks_estimate_id",
  purchase_order: "quickbooks_po_id",
  bill: "quickbooks_bill_id",
};

/**
 * Fetches QB transaction IDs for a list of local entity IDs.
 * Returns a Map<localEntityId, qbTxnId> for O(1) lookups in table rows.
 * Only fires when QB is connected.
 */
export function useQBMappingForList(
  entityIds: string[],
  docType: DocType
): Map<string, string> {
  const { data: qbConfig } = useQuickBooksConfig();
  const isConnected = qbConfig?.is_connected === true;

  const table = tableMap[docType];
  const localCol = entityIdColumn[docType];
  const qbCol = qbIdColumn[docType];

  const { data } = useQuery({
    queryKey: ["qb-mapping-list", docType, entityIds.join(",")],
    enabled: isConnected && entityIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .in(localCol, entityIds);

      if (error) throw error;
      return data as unknown as Array<Record<string, string>>;
    },
  });

  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      const localId = row[localCol];
      const qbId = row[qbCol];
      if (localId && qbId) {
        map.set(localId, qbId);
      }
    }
  }
  return map;
}
