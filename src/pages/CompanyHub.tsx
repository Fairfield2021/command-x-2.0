import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Building2, Package, Users, Shield, BookOpen, ClipboardList, ArrowRight } from "lucide-react";
import { CompanySettingsForm } from "@/components/settings/CompanySettingsForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const TABS = [
  { id: "settings", label: "Settings", icon: Building2 },
  { id: "catalog", label: "Product Catalog", icon: Package },
] as const;

type TabId = (typeof TABS)[number]["id"];

const adminLinks = [
  { title: "User Management", description: "Manage team members and roles", icon: Users, url: "/user-management" },
  { title: "Permissions", description: "Configure module-level access", icon: Shield, url: "/permissions" },
  { title: "QuickBooks", description: "Sync settings and integration", icon: BookOpen, url: "/settings/quickbooks" },
  { title: "Audit Logs", description: "View system activity history", icon: ClipboardList, url: "/admin/audit-logs" },
];

export default function CompanyHub() {
  const { isAdmin, isManager, loading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    const hash = location.hash.replace("#", "") as TabId;
    return TABS.some((t) => t.id === hash) ? hash : "settings";
  }, [location.hash]);

  const handleTabChange = (tab: string) => {
    navigate({ hash: tab === "settings" ? "" : tab }, { replace: true });
  };

  if (loading) {
    return (
      <PageLayout title="Company" description="Company settings and catalog">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <SEO
        title="Company"
        description="Manage company settings, product catalog, and business configuration"
        keywords="company settings, product catalog, business configuration"
      />
      <PageLayout title="Company" description="Settings and product catalog">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full justify-start bg-muted/50 p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-0">
            <CompanySettingsForm />

            {/* Admin Quick Links */}
            {(isAdmin || isManager) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Administration</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {adminLinks.map((link) => (
                    <Link key={link.url} to={link.url}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <link.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{link.title}</p>
                            <p className="text-xs text-muted-foreground">{link.description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="catalog" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Product Catalog
                </CardTitle>
                <CardDescription>
                  Manage your products, materials, and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/products">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">Open Product Catalog</p>
                        <p className="text-xs text-muted-foreground">
                          View, add, and manage all products with QuickBooks sync
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
