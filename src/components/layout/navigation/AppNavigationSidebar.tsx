import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
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
  Shield,
  BookOpen,
  ClipboardList,
  LogOut,
  ChevronDown,
  Folder,
  UserPlus,
  Package,
  MapPin,
  CalendarCheck,
  DollarSign,
  MessageSquareText,
  FileBox,
  Hammer,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { GlobalCreateMenu } from "./GlobalCreateMenu";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navSections: NavSection[] = [
  {
    label: "Home",
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/", icon: Home },
    ],
  },
  {
    label: "Workspace",
    defaultOpen: true,
    items: [
      { title: "Jobs", url: "/jobs", icon: Briefcase },
      { title: "Projects", url: "/projects", icon: Folder },
      { title: "Sales", url: "/sales", icon: DollarSign },
      { title: "Estimates", url: "/estimates", icon: FileText },
      { title: "Invoices", url: "/invoices", icon: Receipt },
      { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart },
      { title: "Vendor Bills", url: "/vendor-bills", icon: ClipboardList },
      { title: "Change Orders", url: "/change-orders/new", icon: FileBox },
      { title: "Time Tracking", url: "/time-tracking", icon: Clock },
      { title: "Assignments", url: "/project-assignments", icon: CalendarCheck },
      { title: "Products", url: "/products", icon: Package },
      { title: "Documents", url: "/document-center", icon: Folder },
      { title: "Messages", url: "/messages", icon: MessageSquareText },
    ],
  },
  {
    label: "People",
    defaultOpen: false,
    items: [
      { title: "Personnel", url: "/personnel", icon: Users },
      { title: "Customers", url: "/customers", icon: UserCheck },
      { title: "Vendors", url: "/vendors", icon: Building2 },
      { title: "Applications", url: "/staffing/applications", icon: UserPlus },
      { title: "Badge Templates", url: "/badge-templates", icon: Shield },
      { title: "Staffing Map", url: "/staffing/map", icon: MapPin },
    ],
  },
  {
    label: "Company",
    defaultOpen: false,
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "User Management", url: "/user-management", icon: Users, adminOnly: true },
      { title: "Permissions", url: "/permissions", icon: Shield, adminOnly: true },
      { title: "QuickBooks", url: "/settings/quickbooks", icon: BookOpen, adminOnly: true },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList, adminOnly: true },
      { title: "Completions", url: "/completion-reviews", icon: Hammer, adminOnly: true },
    ],
  },
];

export function AppNavigationSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, isManager } = useUserRole();
  const { state } = useSidebar();
  const { resolvedTheme } = useTheme();
  const collapsed = state === "collapsed";

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.managerOnly && !isAdmin && !isManager) return false;
      return true;
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-3">
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <img
            src={resolvedTheme === "light" ? logoDark : logo}
            alt="CommandX"
            className={cn(
              "object-contain transition-all",
              collapsed ? "h-6 w-6" : "h-7 w-auto max-w-[140px]"
            )}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => {
          const filteredItems = filterItems(section.items);
          if (filteredItems.length === 0) return null;

          // For Home section (single item), no collapsible needed
          if (section.label === "Home") {
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={item.title}
                        >
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const sectionHasActive = filteredItems.some((i) => isActive(i.url));

          return (
            <Collapsible
              key={section.label}
              defaultOpen={section.defaultOpen || sectionHasActive}
              className="group/collapsible"
            >
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors">
                    {section.label}
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {filteredItems.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                            tooltip={item.title}
                          >
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <GlobalCreateMenu />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sign Out"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
