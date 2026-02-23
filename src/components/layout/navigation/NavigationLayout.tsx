import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardDraftProvider } from "@/contexts/DashboardDraftContext";
import { BackgroundMediaLayer } from "../BackgroundMediaLayer";
import { AppNavigationSidebar } from "./AppNavigationSidebar";
import { NavigationHeader } from "./NavigationHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NavigationLayoutProps {
  children?: ReactNode;
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <DashboardDraftProvider>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
          <BackgroundMediaLayer />

          {/* Desktop sidebar */}
          <AppNavigationSidebar />

          {/* Main area */}
          <div className="flex flex-1 flex-col min-w-0">
            <NavigationHeader />
            <main
              className={cn(
                "flex-1 flex flex-col overflow-x-hidden",
                isMobile && "pb-14" // account for mobile bottom nav
              )}
            >
              {children ?? <Outlet />}
            </main>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </SidebarProvider>
    </DashboardDraftProvider>
  );
}
