
-- =============================================
-- Step 6: QuickBooks Integration Hardening
-- =============================================

-- 1. Standardize mapping tables: add sync_direction and error_message where missing

-- quickbooks_customer_mappings
ALTER TABLE public.quickbooks_customer_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';
ALTER TABLE public.quickbooks_customer_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;

-- quickbooks_invoice_mappings  
ALTER TABLE public.quickbooks_invoice_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';
ALTER TABLE public.quickbooks_invoice_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.quickbooks_invoice_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
-- Backfill last_synced_at from synced_at if it exists
UPDATE public.quickbooks_invoice_mappings SET last_synced_at = synced_at WHERE last_synced_at IS NULL AND synced_at IS NOT NULL;

-- quickbooks_bill_mappings
ALTER TABLE public.quickbooks_bill_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';

-- quickbooks_estimate_mappings
ALTER TABLE public.quickbooks_estimate_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';
ALTER TABLE public.quickbooks_estimate_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;

-- quickbooks_po_mappings
ALTER TABLE public.quickbooks_po_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';
ALTER TABLE public.quickbooks_po_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;

-- quickbooks_account_mappings
ALTER TABLE public.quickbooks_account_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';
ALTER TABLE public.quickbooks_account_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;

-- quickbooks_product_mappings
ALTER TABLE public.quickbooks_product_mappings ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'export';
ALTER TABLE public.quickbooks_product_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;

-- quickbooks_vendor_mappings (already has sync_direction, add error_message)
ALTER TABLE public.quickbooks_vendor_mappings ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Create sync queue table
CREATE TABLE IF NOT EXISTS public.quickbooks_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'create',
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplication index: only one pending/processing item per entity+action
CREATE UNIQUE INDEX IF NOT EXISTS idx_qb_sync_queue_dedup
ON public.quickbooks_sync_queue (entity_type, entity_id, action)
WHERE status IN ('pending', 'processing');

-- Index for worker to pick up items
CREATE INDEX IF NOT EXISTS idx_qb_sync_queue_status ON public.quickbooks_sync_queue (status, priority DESC, scheduled_at ASC);

-- Enable RLS
ALTER TABLE public.quickbooks_sync_queue ENABLE ROW LEVEL SECURITY;

-- Admin/manager can SELECT, INSERT, UPDATE (no DELETE)
CREATE POLICY "Admin/manager can view sync queue"
  ON public.quickbooks_sync_queue FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admin/manager can insert sync queue"
  ON public.quickbooks_sync_queue FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admin/manager can update sync queue"
  ON public.quickbooks_sync_queue FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 3. Create immutable API log table
CREATE TABLE IF NOT EXISTS public.quickbooks_api_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  quickbooks_entity_id TEXT,
  http_method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  http_status INTEGER,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  request_sent_at TIMESTAMPTZ NOT NULL,
  response_received_at TIMESTAMPTZ,
  initiated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by entity
CREATE INDEX IF NOT EXISTS idx_qb_api_log_entity ON public.quickbooks_api_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_api_log_created ON public.quickbooks_api_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.quickbooks_api_log ENABLE ROW LEVEL SECURITY;

-- Admin/accounting can SELECT only
CREATE POLICY "Admin can view API logs"
  ON public.quickbooks_api_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Service role inserts (edge functions use service role key)
-- No INSERT policy needed for service role - it bypasses RLS

-- Immutability trigger: prevent UPDATE and DELETE
CREATE OR REPLACE FUNCTION public.prevent_qb_api_log_modification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'QuickBooks API log entries are immutable and cannot be modified or deleted.';
END;
$$;

CREATE TRIGGER prevent_qb_api_log_update
  BEFORE UPDATE ON public.quickbooks_api_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_qb_api_log_modification();

CREATE TRIGGER prevent_qb_api_log_delete
  BEFORE DELETE ON public.quickbooks_api_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_qb_api_log_modification();
