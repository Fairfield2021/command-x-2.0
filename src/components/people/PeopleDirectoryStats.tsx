import { Users, UserCheck, Building2 } from "lucide-react";
import { usePersonnel } from "@/integrations/supabase/hooks/usePersonnel";
import { useCustomers } from "@/integrations/supabase/hooks/useCustomers";
import { useVendors } from "@/integrations/supabase/hooks/useVendors";

export function PeopleDirectoryStats() {
  const { data: personnel } = usePersonnel({});
  const { data: customers } = useCustomers();
  const { data: vendors } = useVendors();

  const personnelCount = personnel?.length ?? 0;
  const customerCount = customers?.length ?? 0;
  const vendorCount = vendors?.filter((v) => v.vendor_type !== "personnel")?.length ?? 0;
  const total = personnelCount + customerCount + vendorCount;

  const stats = [
    { label: "Total People", value: total, icon: Users, color: "text-primary" },
    { label: "Personnel", value: personnelCount, icon: Users, color: "text-blue-500" },
    { label: "Customers", value: customerCount, icon: UserCheck, color: "text-green-500" },
    { label: "Vendors", value: vendorCount, icon: Building2, color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border bg-card p-3 md:p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
