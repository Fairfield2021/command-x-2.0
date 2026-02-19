
-- =====================================================
-- Step 4: Accounting Subledger System
-- =====================================================

-- 1. accounting_transactions (append-only ledger)
CREATE TABLE public.accounting_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'bill', 'payment', 'journal_entry', 'payroll')),
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  description TEXT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  reversal_transaction_id UUID REFERENCES public.accounting_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_acct_txn_date ON public.accounting_transactions(transaction_date);
CREATE INDEX idx_acct_txn_status ON public.accounting_transactions(status);
CREATE INDEX idx_acct_txn_ref ON public.accounting_transactions(reference_type, reference_id);
CREATE INDEX idx_acct_txn_reversal ON public.accounting_transactions(reversal_transaction_id);

-- 2. accounting_lines (debit/credit entries)
CREATE TABLE public.accounting_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.accounting_transactions(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL DEFAULT 1,
  account_id UUID REFERENCES public.expense_categories(id),
  account_code TEXT,
  account_name TEXT,
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  project_id UUID REFERENCES public.projects(id),
  vendor_id UUID REFERENCES public.vendors(id),
  customer_id UUID REFERENCES public.customers(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX idx_acct_lines_txn ON public.accounting_lines(transaction_id);
CREATE INDEX idx_acct_lines_account ON public.accounting_lines(account_id);
CREATE INDEX idx_acct_lines_project ON public.accounting_lines(project_id);

-- 3. accounting_sync_map
CREATE TABLE public.accounting_sync_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.accounting_transactions(id) UNIQUE,
  quickbooks_entity_type TEXT NOT NULL,
  quickbooks_entity_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_qb_entity UNIQUE (quickbooks_entity_type, quickbooks_entity_id)
);

-- 4. accounting_sync_audit_log (immutable)
CREATE TABLE public.accounting_sync_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_map_id UUID REFERENCES public.accounting_sync_map(id),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_quickbooks', 'from_quickbooks')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'error')),
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- Trigger Functions
-- =====================================================

-- 1. Immutability: prevent updates to posted transactions (except reversal)
CREATE OR REPLACE FUNCTION public.enforce_posted_transaction_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    -- Only allow marking as reversed with required fields
    IF NEW.status = 'reversed'
       AND NEW.reversed_at IS NOT NULL
       AND NEW.reversed_by IS NOT NULL
       AND NEW.reversal_transaction_id IS NOT NULL THEN
      -- Allow but freeze all other fields
      NEW.transaction_date := OLD.transaction_date;
      NEW.transaction_type := OLD.transaction_type;
      NEW.reference_type := OLD.reference_type;
      NEW.reference_id := OLD.reference_id;
      NEW.reference_number := OLD.reference_number;
      NEW.description := OLD.description;
      NEW.total_amount := OLD.total_amount;
      NEW.posted_at := OLD.posted_at;
      NEW.posted_by := OLD.posted_by;
      NEW.created_at := OLD.created_at;
      NEW.created_by := OLD.created_by;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Posted transactions are immutable. Corrections must be made via reversals.';
    END IF;
  END IF;

  -- Prevent updates to already-reversed transactions
  IF OLD.status = 'reversed' THEN
    RAISE EXCEPTION 'Reversed transactions cannot be modified.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_posted_immutability
  BEFORE UPDATE ON public.accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_posted_transaction_immutability();

-- 2. Balance validation: ensure debits = credits before posting
CREATE OR REPLACE FUNCTION public.validate_transaction_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_debits NUMERIC(15,2);
  v_total_credits NUMERIC(15,2);
BEGIN
  -- Only validate when status changes to 'posted'
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO v_total_debits, v_total_credits
    FROM public.accounting_lines
    WHERE transaction_id = NEW.id;

    IF v_total_debits = 0 AND v_total_credits = 0 THEN
      RAISE EXCEPTION 'Cannot post transaction with no line items.';
    END IF;

    IF v_total_debits != v_total_credits THEN
      RAISE EXCEPTION 'Transaction does not balance. Debits: %, Credits: %', v_total_debits, v_total_credits;
    END IF;

    -- Set posted_at if not already set
    IF NEW.posted_at IS NULL THEN
      NEW.posted_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_balance_before_post
  BEFORE UPDATE ON public.accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_balance();

-- 3. Prevent modification of lines belonging to posted/reversed transactions
CREATE OR REPLACE FUNCTION public.prevent_posted_lines_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status TEXT;
  v_txn_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_txn_id := OLD.transaction_id;
  ELSE
    v_txn_id := OLD.transaction_id;
  END IF;

  SELECT status INTO v_status
  FROM public.accounting_transactions
  WHERE id = v_txn_id;

  IF v_status IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'Cannot modify lines of a % transaction. Use reversals for corrections.', v_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_posted_lines_mod
  BEFORE UPDATE OR DELETE ON public.accounting_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_lines_modification();

-- Prevent deleting accounting transactions entirely
CREATE OR REPLACE FUNCTION public.prevent_accounting_transaction_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'Cannot delete % accounting transactions.', OLD.status;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_acct_txn_delete
  BEFORE DELETE ON public.accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_accounting_transaction_delete();

-- Prevent deleting/updating sync audit log (immutable)
CREATE OR REPLACE FUNCTION public.prevent_sync_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Sync audit log entries are immutable and cannot be modified or deleted.';
END;
$$;

CREATE TRIGGER trg_prevent_sync_audit_mod
  BEFORE UPDATE OR DELETE ON public.accounting_sync_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_sync_audit_log_modification();

-- =====================================================
-- RLS Policies
-- =====================================================

-- accounting_transactions
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acct_txn_select" ON public.accounting_transactions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'accounting')
  );

CREATE POLICY "acct_txn_insert" ON public.accounting_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accounting')
  );

CREATE POLICY "acct_txn_update" ON public.accounting_transactions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accounting')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accounting')
  );

-- accounting_lines
ALTER TABLE public.accounting_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acct_lines_select" ON public.accounting_lines
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'accounting')
  );

CREATE POLICY "acct_lines_insert" ON public.accounting_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accounting')
  );

-- accounting_sync_map
ALTER TABLE public.accounting_sync_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acct_sync_map_select" ON public.accounting_sync_map
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'accounting')
  );

CREATE POLICY "acct_sync_map_insert" ON public.accounting_sync_map
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "acct_sync_map_update" ON public.accounting_sync_map
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- accounting_sync_audit_log
ALTER TABLE public.accounting_sync_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acct_sync_audit_select" ON public.accounting_sync_audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accounting')
  );

CREATE POLICY "acct_sync_audit_insert" ON public.accounting_sync_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accounting')
  );
