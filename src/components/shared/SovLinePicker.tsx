import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSovLines, type SovLine } from "@/hooks/useSovLines";

interface SovLinePickerProps {
  contractId: string;
  value: string | null;
  onChange: (sovLineId: string | null) => void;
  contextType: "po" | "bill" | "invoice";
  disabled?: boolean;
  placeholder?: string;
}

const contextConfig = {
  po: { label: "Remaining", colorClass: "text-amber-600 dark:text-amber-400" },
  bill: { label: "Remaining", colorClass: "text-purple-600 dark:text-purple-400" },
  invoice: { label: "Remaining", colorClass: "text-teal-600 dark:text-teal-400" },
} as const;

function getRemainingBalance(line: SovLine, contextType: "po" | "bill" | "invoice"): number {
  const total = line.total_value ?? 0;
  switch (contextType) {
    case "po":
      return total - line.committed_cost;
    case "bill":
      return total - line.billed_to_date;
    case "invoice":
      return line.balance_remaining ?? (total - line.invoiced_to_date);
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function SovLinePicker({
  contractId,
  value,
  onChange,
  contextType,
  disabled = false,
  placeholder = "Select SOV line…",
}: SovLinePickerProps) {
  const [open, setOpen] = useState(false);
  const { data: sovLines = [], isLoading } = useSovLines(contractId);
  const config = contextConfig[contextType];

  const selectedLine = useMemo(
    () => sovLines.find((l) => l.id === value) ?? null,
    [sovLines, value]
  );

  const buttonLabel = selectedLine
    ? `#${selectedLine.line_number} — ${selectedLine.description}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal truncate"
        >
          <span className="truncate">{isLoading ? "Loading…" : buttonLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search SOV lines…" />
          <CommandList>
            <CommandEmpty>No SOV lines found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground italic">None</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={`SOV Lines — ${config.label}`}>
              {sovLines.map((line) => {
                const remaining = getRemainingBalance(line, contextType);
                const isFullyUsed = remaining <= 0;
                const isSelected = value === line.id;

                return (
                  <CommandItem
                    key={line.id}
                    value={`${line.line_number} ${line.description}`}
                    disabled={isFullyUsed}
                    onSelect={() => {
                      if (isFullyUsed) return;
                      onChange(isSelected ? null : line.id);
                      setOpen(false);
                    }}
                    className={cn(isFullyUsed && "opacity-50")}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                      <span className="truncate">
                        <span className="font-medium">#{line.line_number}</span>
                        {line.is_addendum && (
                          <span className="ml-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 rounded">CO</span>
                        )}
                        <span className="ml-1">— {line.description}</span>
                      </span>
                      <span className={cn("shrink-0 text-xs font-medium tabular-nums", isFullyUsed ? "text-muted-foreground" : config.colorClass)}>
                        {isFullyUsed ? "(Fully Used)" : formatCurrency(remaining)}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
