import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Briefcase, Users, Building2, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const tabs = [
  { id: "home", icon: Home, label: "Home", path: "/" },
  { id: "workspace", icon: Briefcase, label: "Work", path: "/jobs" },
  { id: "create", icon: Plus, label: "Create", path: "" },
  { id: "people", icon: Users, label: "People", path: "/people" },
  { id: "company", icon: Building2, label: "Company", path: "/settings" },
];

const createActions = [
  { label: "New Job", path: "/jobs?new=true" },
  { label: "New Customer", path: "/customers?new=true" },
  { label: "New Vendor", path: "/vendors?new=true" },
  { label: "New Personnel", path: "/personnel?new=true" },
  { label: "New Estimate", path: "/estimates?new=true" },
  { label: "New Invoice", path: "/invoices?new=true" },
];

const PUBLIC_ROUTES = ["/auth", "/accept-invitation", "/approve-estimate", "/apply", "/onboard", "/contractor"];
const PORTAL_ROUTES = ["/portal", "/vendor", "/subcontractor"];

export function MobileBottomNav() {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (!isMobile) return null;

  const isPublicRoute = PUBLIC_ROUTES.some((r) => location.pathname.startsWith(r));
  const isPortalRoute = PORTAL_ROUTES.some((r) => location.pathname.startsWith(r));
  if (isPublicRoute || isPortalRoute || !user) return null;

  const isActive = (path: string) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {tabs.map((tab) => {
            if (tab.id === "create") {
              return (
                <button
                  key={tab.id}
                  onClick={() => setCreateOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
                    <Plus className="h-5 w-5" />
                  </div>
                </button>
              );
            }

            const Icon = tab.icon;
            const active = isActive(tab.path);

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Create action sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Quick Create</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {createActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  navigate(action.path);
                  setCreateOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
