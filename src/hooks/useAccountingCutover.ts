import { useCompanySettings } from "@/integrations/supabase/hooks/useCompanySettings";

export const useAccountingCutover = () => {
  const { data: settings, isLoading } = useCompanySettings();

  const cutoverDate = settings?.accounting_cutover_date ?? null;
  const hasCutover = !!cutoverDate;

  const isLegacy = (date: string): boolean => {
    if (!cutoverDate) return false;
    return date < cutoverDate;
  };

  return { cutoverDate, hasCutover, isLegacy, isLoading };
};
