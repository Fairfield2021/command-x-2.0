import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, ChevronDown, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProjectLinkedVendorsSectionProps {
  projectId: string;
}

interface VendorSummary {
  vendor_id: string;
  vendor_name: string;
  po_count: number;
  wo_count: number;
  email?: string | null;
  phone?: string | null;
}

export function ProjectLinkedVendorsSection({ projectId }: ProjectLinkedVendorsSectionProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const { data: vendors = [] } = useQuery({
    queryKey: ["project-linked-vendors", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // Fetch POs with order_type
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select("vendor_id, vendor_name, order_type")
        .eq("project_id", projectId)
        .not("vendor_id", "is", null);

      if (poError) throw poError;

      const map = new Map<string, VendorSummary>();
      for (const row of poData || []) {
        if (!row.vendor_id) continue;
        const existing = map.get(row.vendor_id);
        const isWO = row.order_type === "work_order";
        if (existing) {
          if (isWO) existing.wo_count++;
          else existing.po_count++;
        } else {
          map.set(row.vendor_id, {
            vendor_id: row.vendor_id,
            vendor_name: row.vendor_name || "Unknown Vendor",
            po_count: isWO ? 0 : 1,
            wo_count: isWO ? 1 : 0,
          });
        }
      }

      // Fetch vendor contact info for the collected IDs
      const vendorIds = Array.from(map.keys());
      if (vendorIds.length > 0) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("id, email, phone")
          .in("id", vendorIds);

        for (const v of vendorData || []) {
          const entry = map.get(v.id);
          if (entry) {
            entry.email = v.email;
            entry.phone = v.phone;
          }
        }
      }

      return Array.from(map.values());
    },
  });

  if (vendors.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 hover:bg-secondary rounded-lg mb-2 transition-colors group">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary group-hover:text-foreground transition-colors" />
          <span className="font-heading text-sm sm:text-base font-semibold">Linked Vendors</span>
          <Badge variant="secondary" className="text-xs">{vendors.length}</Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-fade-in">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <Card
              key={v.vendor_id}
              className="glass border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/vendors/${v.vendor_id}`)}
            >
              <CardContent className="py-3 px-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{v.vendor_name}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {v.po_count > 0 && (
                      <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] px-1.5 py-0">
                        {v.po_count} PO{v.po_count !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {v.wo_count > 0 && (
                      <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px] px-1.5 py-0">
                        {v.wo_count} WO{v.wo_count !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                {(v.email || v.phone) && (
                  <div className="flex flex-col gap-0.5">
                    {v.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${v.phone}`} className="hover:text-foreground transition-colors">{v.phone}</a>
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${v.email}`} className="hover:text-foreground transition-colors truncate">{v.email}</a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
