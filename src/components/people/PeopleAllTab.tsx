import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePersonnel } from "@/integrations/supabase/hooks/usePersonnel";
import { useCustomers } from "@/integrations/supabase/hooks/useCustomers";
import { useVendors } from "@/integrations/supabase/hooks/useVendors";
import { TablePagination } from "@/components/shared/TablePagination";

interface PeopleAllTabProps {
  search: string;
}

interface UnifiedPerson {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: "personnel" | "customer" | "vendor";
  detailPath: string;
  subtitle: string | null;
}

const typeMeta = {
  personnel: { label: "Personnel", icon: Users, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  customer: { label: "Customer", icon: UserCheck, className: "bg-green-500/10 text-green-500 border-green-500/20" },
  vendor: { label: "Vendor", icon: Building2, className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
};

export function PeopleAllTab({ search }: PeopleAllTabProps) {
  const navigate = useNavigate();
  const { data: personnel, isLoading: pLoading } = usePersonnel({});
  const { data: customers, isLoading: cLoading } = useCustomers();
  const { data: vendors, isLoading: vLoading } = useVendors();

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const isLoading = pLoading || cLoading || vLoading;

  const allPeople = useMemo(() => {
    const result: UnifiedPerson[] = [];

    personnel?.forEach((p) => {
      result.push({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        phone: p.phone,
        type: "personnel",
        detailPath: `/personnel/${p.id}`,
        subtitle: p.personnel_number || null,
      });
    });

    customers?.forEach((c) => {
      result.push({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        type: "customer",
        detailPath: `/customers/${c.id}`,
        subtitle: c.company,
      });
    });

    vendors
      ?.filter((v) => v.vendor_type !== "personnel")
      .forEach((v) => {
        result.push({
          id: v.id,
          name: v.name,
          email: v.email,
          phone: v.phone,
          type: "vendor",
          detailPath: `/vendors/${v.id}`,
          subtitle: v.company || v.specialty,
        });
      });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [personnel, customers, vendors]);

  const filtered = useMemo(() => {
    if (!search) return allPeople;
    const q = search.toLowerCase();
    return allPeople.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [allPeople, search]);

  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {search ? "No people match your search." : "No people found."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {paginated.map((person) => {
          const meta = typeMeta[person.type];
          return (
            <button
              key={`${person.type}-${person.id}`}
              onClick={() => navigate(person.detailPath)}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors w-full"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{person.name}</span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.className}`}>
                    {meta.label}
                  </Badge>
                </div>
                {person.subtitle && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {person.subtitle}
                  </p>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {person.email}
                </p>
              </div>
              {person.phone && (
                <span className="text-xs text-muted-foreground hidden sm:block shrink-0">
                  {person.phone}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalCount={filtered.length}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(size) => {
          setRowsPerPage(size);
          setCurrentPage(1);
        }}
        rowsPerPageOptions={[20, 50, 100]}
      />
    </div>
  );
}
