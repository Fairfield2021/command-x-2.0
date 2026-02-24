import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, FileText } from "lucide-react";

interface ProjectLinkedVendorsSectionProps {
  projectId: string;
}

interface VendorSummary {
  vendor_id: string;
  vendor_name: string;
  po_count: number;
}

export function ProjectLinkedVendorsSection({ projectId }: ProjectLinkedVendorsSectionProps) {
  const navigate = useNavigate();

  const { data: vendors = [] } = useQuery({
    queryKey: ["project-linked-vendors", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("vendor_id, vendor_name")
        .eq("project_id", projectId)
        .not("vendor_id", "is", null);

      if (error) throw error;

      const map = new Map<string, VendorSummary>();
      for (const row of data || []) {
        if (!row.vendor_id) continue;
        const existing = map.get(row.vendor_id);
        if (existing) {
          existing.po_count++;
        } else {
          map.set(row.vendor_id, {
            vendor_id: row.vendor_id,
            vendor_name: row.vendor_name || "Unknown Vendor",
            po_count: 1,
          });
        }
      }
      return Array.from(map.values());
    },
  });

  if (vendors.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-lg font-semibold">Linked Vendors ({vendors.length})</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <Card
            key={v.vendor_id}
            className="glass border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/vendors/${v.vendor_id}`)}
          >
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="font-medium text-sm truncate">{v.vendor_name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-2">
                <FileText className="h-3 w-3" />
                {v.po_count} PO{v.po_count !== 1 ? "s" : ""}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
