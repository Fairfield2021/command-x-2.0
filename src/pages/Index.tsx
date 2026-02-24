import { SEO } from "@/components/SEO";
import { PageLayout } from "@/components/layout/PageLayout";
import { RowBasedDashboard } from "@/components/dashboard/rows/RowBasedDashboard";
import { PMDashboard } from "@/components/dashboard/roles/PMDashboard";
import { FieldCrewDashboard } from "@/components/dashboard/roles/FieldCrewDashboard";
import { AccountingDashboard } from "@/components/dashboard/roles/AccountingDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardRouter() {
  const { isAdmin, isManager, isAccounting, isPersonnel, loading } = useUserRole();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isAccounting) return <AccountingDashboard />;
  if (isPersonnel) return <FieldCrewDashboard />;
  if (isManager) return <PMDashboard />;
  // Admin, user, vendor, or fallback → Owner dashboard
  return <RowBasedDashboard />;
}

const Dashboard = () => {
  return (
    <>
      <SEO
        title="Dashboard"
        description="Overview of your business metrics, estimates, invoices, and recent activity"
        keywords="business dashboard, metrics, estimates overview, invoice tracking"
      />
      <PageLayout title="Dashboard" description="Welcome back">
        <DashboardRouter />
      </PageLayout>
    </>
  );
};

export default Dashboard;
