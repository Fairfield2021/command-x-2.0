-- Add accounting_cutover_date to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS accounting_cutover_date DATE DEFAULT NULL;