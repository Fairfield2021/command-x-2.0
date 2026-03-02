import { useMemo } from "react";
import { FileText, DollarSign, Plus, Minus, Calendar, User, AlertTriangle } from "lucide-react";
import { Contract } from "@/hooks/useContracts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { formatLocalDate } from "@/lib/dateUtils";

interface ChangeOrderSummary {
  id: string;
  change_type: string;
  status: string;
  co_value?: number;
}

interface ContractHeaderProps {
  contract: Contract;
  customerName: string | null;
  changeOrders?: ChangeOrderSummary[];
}

export function ContractHeader({ contract, customerName, changeOrders = [] }: ContractHeaderProps) {
  const coStats = useMemo(() => {
    let approvedAdditive = 0;
    let approvedDeductive = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    changeOrders.forEach((co) => {
      if (co.status === "approved") {
        approvedCount++;
        if (co.change_type === "additive") approvedAdditive++;
        if (co.change_type === "deductive") approvedDeductive++;
      }
      if (co.status === "pending_approval") pendingCount++;
    });
    return { approvedAdditive, approvedDeductive, pendingCount, approvedCount, totalCount: changeOrders.length };
  }, [changeOrders]);

  const scrollToCOs = () => {
    const el = document.getElementById("change-orders-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const financialCards = [
    {
      title: "Original Value",
      value: formatCurrency(contract.original_value),
      icon: DollarSign,
      iconColor: "text-muted-foreground",
      iconBg: "bg-muted",
      cardClass: "",
      subtitle: null as string | null,
      clickable: false,
    },
    {
      title: "Addendums",
      value: `+${formatCurrency(contract.addendum_value)}`,
      icon: Plus,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      cardClass: "",
      subtitle: coStats.approvedAdditive > 0 ? `${coStats.approvedAdditive} approved CO${coStats.approvedAdditive !== 1 ? "s" : ""}` : null,
      clickable: coStats.approvedAdditive > 0,
    },
    {
      title: "Deductions",
      value: `-${formatCurrency(contract.deduction_value)}`,
      icon: Minus,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      cardClass: "",
      subtitle: coStats.approvedDeductive > 0 ? `${coStats.approvedDeductive} approved CO${coStats.approvedDeductive !== 1 ? "s" : ""}` : null,
      clickable: coStats.approvedDeductive > 0,
    },
    {
      title: "Current Value",
      value: formatCurrency(contract.current_value),
      icon: DollarSign,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      cardClass: "bg-primary/10 border-primary/20",
      subtitle: null,
      clickable: false,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metadata Row */}
      <div className="glass border-border rounded-lg p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {contract.contract_number || "No Number"}
          </span>
        </div>
        <span className="text-sm text-foreground font-semibold">{contract.title}</span>
        <StatusBadge status={contract.status as any} />
        {customerName && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{customerName}</span>
          </div>
        )}
        {contract.date_signed && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatLocalDate(contract.date_signed)}</span>
          </div>
        )}
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={card.clickable ? scrollToCOs : undefined}
              className={`glass border-border rounded-lg p-3 sm:p-4 ${card.cardClass} ${
                card.clickable ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              </div>
              <p className="font-heading text-lg sm:text-xl font-bold text-foreground">
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* CO Mini Summary Strip */}
      {coStats.totalCount > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
          {coStats.pendingCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              {coStats.pendingCount} pending approval
            </span>
          )}
          {coStats.pendingCount > 0 && <span className="text-border">|</span>}
          <span>{coStats.approvedCount} approved</span>
          <span className="text-border">|</span>
          <span>{coStats.totalCount} total</span>
        </div>
      )}

      {/* Pending Approval Banner */}
      {contract.status === "active" && coStats.pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{coStats.pendingCount} change order{coStats.pendingCount !== 1 ? "s" : ""} awaiting approval</span>
        </div>
      )}
    </div>
  );
}
