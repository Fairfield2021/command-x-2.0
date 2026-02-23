import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/layout/PageLayout";
import { SEO } from "@/components/SEO";
import { SearchInput } from "@/components/ui/search-input";
import { PeopleDirectoryStats } from "@/components/people/PeopleDirectoryStats";
import { PeopleAllTab } from "@/components/people/PeopleAllTab";
import { Users, UserCheck, Building2, LayoutGrid } from "lucide-react";
import React from "react";

// Lazy-load the existing full pages as tab content
const Personnel = React.lazy(() => import("./Personnel"));
const Customers = React.lazy(() => import("./Customers"));
const Vendors = React.lazy(() => import("./Vendors"));

const VALID_TABS = ["all", "personnel", "customers", "vendors"] as const;
type TabValue = (typeof VALID_TABS)[number];

const PeopleDirectory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromHash = (): TabValue => {
    const hash = location.hash.replace("#", "");
    return VALID_TABS.includes(hash as TabValue) ? (hash as TabValue) : "all";
  };

  const [activeTab, setActiveTab] = useState<TabValue>(getTabFromHash);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setActiveTab(getTabFromHash());
  }, [location.hash]);

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    navigate(`/people#${tab}`, { replace: true });
  };

  return (
    <PageLayout title="People Directory">
      <SEO
        title="People Directory"
        description="Unified directory of personnel, customers, and vendors"
      />

      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <PeopleDirectoryStats />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
              <TabsTrigger value="personnel" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Personnel</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Customers</span>
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Vendors</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "all" && (
              <SearchInput
                placeholder="Search all people..."
                value={search}
                onChange={setSearch}
                className="w-full sm:max-w-sm min-h-[44px] sm:min-h-[40px]"
              />
            )}
          </div>

          <TabsContent value="all" className="mt-4">
            <PeopleAllTab search={search} />
          </TabsContent>

          <TabsContent value="personnel" className="mt-4">
            <React.Suspense fallback={<div className="flex justify-center py-12"><span className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
              <PersonnelEmbedded />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <React.Suspense fallback={<div className="flex justify-center py-12"><span className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
              <CustomersEmbedded />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="vendors" className="mt-4">
            <React.Suspense fallback={<div className="flex justify-center py-12"><span className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
              <VendorsEmbedded />
            </React.Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

// Thin wrappers that render the existing pages without their PageLayout shell
// For now, we just render the full pages — they have their own PageLayout which
// will nest. A cleaner approach would be to extract the inner content, but this
// is the safest incremental step. The nested PageLayout just adds a bit of
// spacing which is acceptable.
function PersonnelEmbedded() {
  return <Personnel />;
}

function CustomersEmbedded() {
  return <Customers />;
}

function VendorsEmbedded() {
  return <Vendors />;
}

export default PeopleDirectory;
