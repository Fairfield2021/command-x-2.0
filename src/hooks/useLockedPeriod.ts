import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanySettings } from "@/integrations/supabase/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/dateUtils";
import { addDays } from "date-fns";

interface AccountingPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
}

interface LockedPeriodValidation {
  isEnabled: boolean;
  lockedPeriodDate: string | null;
  isDateLocked: (date: string | Date) => boolean;
  validateDate: (date: string, entityType: string) => { valid: true } | { valid: false; message: string };
  minAllowedDate: Date | undefined;
  lockedPeriods: AccountingPeriod[];
}

/**
 * Hook for locked period validation in UI components.
 * Checks both global locked_period_date AND individual accounting_periods.
 */
export function useLockedPeriod(): LockedPeriodValidation {
  const { data: settings } = useCompanySettings();

  const lockedPeriodDate = settings?.locked_period_date ?? null;
  const isEnabled = settings?.locked_period_enabled ?? false;

  const { data: lockedPeriods = [] } = useQuery({
    queryKey: ["locked-accounting-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_periods")
        .select("id, period_name, start_date, end_date, is_locked")
        .eq("is_locked", true);
      if (error) throw error;
      return (data ?? []) as AccountingPeriod[];
    },
    staleTime: 60_000,
  });

  const isDateLocked = useMemo(() => {
    return (date: string | Date): boolean => {
      const checkDate = typeof date === "string" ? parseLocalDate(date) : date;
      const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

      // Check global cutoff
      if (isEnabled && lockedPeriodDate) {
        const cutoff = parseLocalDate(lockedPeriodDate);
        const cutoffDateOnly = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
        if (checkDateOnly <= cutoffDateOnly) return true;
      }

      // Check accounting_periods
      for (const period of lockedPeriods) {
        const start = parseLocalDate(period.start_date);
        const end = parseLocalDate(period.end_date);
        const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (checkDateOnly >= startOnly && checkDateOnly <= endOnly) return true;
      }

      return false;
    };
  }, [isEnabled, lockedPeriodDate, lockedPeriods]);

  const validateDate = useMemo(() => {
    return (date: string, entityType: string): { valid: true } | { valid: false; message: string } => {
      if (!date) return { valid: true };

      const checkDate = parseLocalDate(date);
      const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

      // Check global cutoff
      if (isEnabled && lockedPeriodDate) {
        const cutoff = parseLocalDate(lockedPeriodDate);
        const cutoffDateOnly = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
        if (checkDateOnly <= cutoffDateOnly) {
          return {
            valid: false,
            message: `Cannot create/edit ${entityType} dated ${date}. Accounting period is locked through ${lockedPeriodDate}.`
          };
        }
      }

      // Check accounting_periods
      for (const period of lockedPeriods) {
        const start = parseLocalDate(period.start_date);
        const end = parseLocalDate(period.end_date);
        const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (checkDateOnly >= startOnly && checkDateOnly <= endOnly) {
          return {
            valid: false,
            message: `Cannot create/edit ${entityType} dated ${date}. Accounting period "${period.period_name}" is locked.`
          };
        }
      }

      return { valid: true };
    };
  }, [isEnabled, lockedPeriodDate, lockedPeriods]);

  const minAllowedDate = useMemo(() => {
    if (!isEnabled || !lockedPeriodDate) return undefined;
    return addDays(parseLocalDate(lockedPeriodDate), 1);
  }, [isEnabled, lockedPeriodDate]);

  return {
    isEnabled,
    lockedPeriodDate,
    isDateLocked,
    validateDate,
    minAllowedDate,
    lockedPeriods
  };
}
