import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Briefcase,
  FileText,
  Receipt,
  ShoppingCart,
  Clock,
  Users,
  UserCheck,
  Building2,
  Settings,
  Search,
  Folder,
} from "lucide-react";

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Static page navigation items
const pages = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Jobs", icon: Briefcase, path: "/jobs" },
  { label: "Projects", icon: Folder, path: "/projects" },
  { label: "Estimates", icon: FileText, path: "/estimates" },
  { label: "Invoices", icon: Receipt, path: "/invoices" },
  { label: "Purchase Orders", icon: ShoppingCart, path: "/purchase-orders" },
  { label: "Time Tracking", icon: Clock, path: "/time-tracking" },
  { label: "Personnel", icon: Users, path: "/personnel" },
  { label: "Customers", icon: UserCheck, path: "/customers" },
  { label: "Vendors", icon: Building2, path: "/vendors" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface SearchResult {
  id: string;
  label: string;
  path: string;
  type: string;
}

export function GlobalCommandPalette({ open, onOpenChange }: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Live data search with debounce
  const searchData = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const searchTerm = `%${q}%`;
      const [projects, customers, vendors, personnel] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .ilike("name", searchTerm)
          .limit(5),
        supabase
          .from("customers")
          .select("id, name")
          .ilike("name", searchTerm)
          .limit(5),
        supabase
          .from("vendors")
          .select("id, company")
          .ilike("company", searchTerm)
          .limit(5),
        supabase
          .from("personnel")
          .select("id, first_name, last_name")
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
          .limit(5),
      ]);

      const all: SearchResult[] = [
        ...(projects.data || []).map((p) => ({
          id: p.id,
          label: p.name,
          path: `/projects/${p.id}`,
          type: "Project",
        })),
        ...(customers.data || []).map((c) => ({
          id: c.id,
          label: c.name,
          path: `/customers/${c.id}`,
          type: "Customer",
        })),
        ...(vendors.data || []).map((v) => ({
          id: v.id,
          label: v.company || "Unknown",
          path: `/vendors/${v.id}`,
          type: "Vendor",
        })),
        ...(personnel.data || []).map((p) => ({
          id: p.id,
          label: `${p.first_name} ${p.last_name}`,
          path: `/personnel/${p.id}`,
          type: "Personnel",
        })),
      ];
      setResults(all);
    } catch (err) {
      console.error("Command palette search error:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchData(query), 250);
    return () => clearTimeout(timer);
  }, [query, searchData]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setQuery("");
    setResults([]);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, projects, customers…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching…" : "No results found."}
        </CommandEmpty>

        {/* Live data results */}
        {results.length > 0 && (
          <>
            <CommandGroup heading="Results">
              {results.map((r) => (
                <CommandItem
                  key={`${r.type}-${r.id}`}
                  onSelect={() => handleSelect(r.path)}
                >
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{r.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {r.type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Static page navigation */}
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => handleSelect(page.path)}
            >
              <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
