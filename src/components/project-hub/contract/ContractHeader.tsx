import { FileText, DollarSign, Plus, Minus, Calendar, User } from "lucide-react";
import { Contract } from "@/hooks/useContracts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { formatLocalDate } from "@/lib/dateUtils";

interface ContractHeaderProps {
  contract: Contract;
  customerName: string | null;
}

export function ContractHeader({ contract, customerName }: ContractHeaderProps) {
  const financialCards = [
    {
      title: "Original Value",
      value: formatCurrency(contract.original_value),
      icon: DollarSign,
      iconColor: "text-muted-foreground",
      iconBg: "bg-muted",
      cardClass: "",
    },
    {
      title: "Addendums",
      value: `+${formatCurrency(contract.addendum_value)}`,
      icon: Plus,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      cardClass: "",
    },
    {
      title: "Deductions",
      value: `-${formatCurrency(contract.deduction_value)}`,
      icon: Minus,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      cardClass: "",
    },
    {
      title: "Current Value",
      value: formatCurrency(contract.current_value),
      icon: DollarSign,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      cardClass: "bg-primary/10 border-primary/20",
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
              className={`glass border-border rounded-lg p-3 sm:p-4 ${card.cardClass}`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
