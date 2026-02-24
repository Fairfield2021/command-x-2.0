import { useMemo } from "react";
import { Link } from "react-router-dom";
import { WelcomeStrip } from "../rows/WelcomeStrip";
import { useInvoices } from "@/integrations/supabase/hooks/useInvoices";
import { useQuickBooksConfig } from "@/integrations/supabase/hooks/useQuickBooks";
import { InvoiceAgingSummary } from "../rows/InvoiceAgingSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, AlertTriangle, Cloud, CloudOff, ArrowRight, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

export function AccountingDashboard() {
  const { data: invoices, isLoading: invLoading } = useInvoices();
  const { data: qbConfig } = useQuickBooksConfig();

  const pendingInvoices = useMemo(
    () => (invoices || []).filter((inv) => inv.status === "sent" || inv.status === "draft"),
    [invoices]
  );

  const overdueInvoices = useMemo(
    () => (invoices || []).filter((inv) => inv.status === "overdue"),
    [invoices]
  );

  const totalOutstanding = useMemo(
    () => [...pendingInvoices, ...overdueInvoices].reduce((s, inv) => s + inv.remaining_amount, 0),
    [pendingInvoices, overdueInvoices]
  );

  const totalOverdue = useMemo(
    () => overdueInvoices.reduce((s, inv) => s + inv.remaining_amount, 0),
    [overdueInvoices]
  );

  return (
    <div className="space-y-6">
      <WelcomeStrip />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{pendingInvoices.length}</p>
            <p className="text-xs text-muted-foreground">Pending Invoices</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4 flex flex-col items-center justify-center">
            {qbConfig?.is_connected ? (
              <>
                <Cloud className="h-5 w-5 text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">QBO Connected</p>
              </>
            ) : (
              <>
                <CloudOff className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">QBO Not Connected</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue invoices */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Overdue Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : overdueInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No overdue payments 🎉</p>
            ) : (
              overdueInvoices.slice(0, 8).map((inv) => {
                const daysOverdue = inv.due_date
                  ? differenceInDays(new Date(), parseISO(inv.due_date))
                  : 0;
                return (
                  <Link
                    key={inv.id}
                    to="/invoices"
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.number} — {inv.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(inv.remaining_amount)} remaining</p>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      {daysOverdue}d overdue
                    </Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Pending invoices */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : pendingInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All invoices settled</p>
            ) : (
              pendingInvoices.slice(0, 8).map((inv) => (
                <Link
                  key={inv.id}
                  to="/invoices"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {inv.number} — {inv.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(inv.total)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize">{inv.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Aging */}
      <InvoiceAgingSummary />
    </div>
  );
}
