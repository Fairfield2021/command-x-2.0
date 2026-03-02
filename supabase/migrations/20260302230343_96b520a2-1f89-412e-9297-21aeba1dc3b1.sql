
-- Add missing columns to existing tm_tickets table
ALTER TABLE public.tm_tickets
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS hourly_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours_logged numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours_approved numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric GENERATED ALWAYS AS ((hours_logged * hourly_rate) + materials_cost) STORED,
  ADD COLUMN IF NOT EXISTS cap_hours numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS before_photo_url text,
  ADD COLUMN IF NOT EXISTS after_photo_url text,
  ADD COLUMN IF NOT EXISTS change_order_id uuid REFERENCES public.change_orders(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_date timestamptz;

-- Create tm_ticket_entries table
CREATE TABLE IF NOT EXISTS public.tm_ticket_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_ticket_id uuid NOT NULL REFERENCES public.tm_tickets(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  hours numeric NOT NULL DEFAULT 0,
  description text,
  personnel_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on tm_ticket_entries
ALTER TABLE public.tm_ticket_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for tm_ticket_entries (matching project-assignment pattern)
CREATE POLICY "Admins can manage all tm_ticket_entries"
  ON public.tm_ticket_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage all tm_ticket_entries"
  ON public.tm_ticket_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Assigned users can view tm_ticket_entries"
  ON public.tm_ticket_entries FOR SELECT
  TO authenticated
  USING (
    public.is_assigned_to_project(
      auth.uid(),
      (SELECT project_id FROM public.tm_tickets WHERE id = tm_ticket_id)
    )
  );

CREATE POLICY "Assigned users can insert tm_ticket_entries"
  ON public.tm_ticket_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_assigned_to_project(
      auth.uid(),
      (SELECT project_id FROM public.tm_tickets WHERE id = tm_ticket_id)
    )
  );

CREATE POLICY "Assigned users can update tm_ticket_entries"
  ON public.tm_ticket_entries FOR UPDATE
  TO authenticated
  USING (
    public.is_assigned_to_project(
      auth.uid(),
      (SELECT project_id FROM public.tm_tickets WHERE id = tm_ticket_id)
    )
  );

CREATE POLICY "Assigned users can delete tm_ticket_entries"
  ON public.tm_ticket_entries FOR DELETE
  TO authenticated
  USING (
    public.is_assigned_to_project(
      auth.uid(),
      (SELECT project_id FROM public.tm_tickets WHERE id = tm_ticket_id)
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tm_tickets_contract_id ON public.tm_tickets(contract_id);
CREATE INDEX IF NOT EXISTS idx_tm_tickets_change_order_id ON public.tm_tickets(change_order_id);
CREATE INDEX IF NOT EXISTS idx_tm_ticket_entries_tm_ticket_id ON public.tm_ticket_entries(tm_ticket_id);

-- Function to recalculate hours_logged and auto-set status to cap_reached
CREATE OR REPLACE FUNCTION public.recalculate_tm_ticket_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket_id uuid;
  v_total_hours numeric;
  v_cap numeric;
  v_current_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ticket_id := OLD.tm_ticket_id;
  ELSE
    v_ticket_id := NEW.tm_ticket_id;
  END IF;

  SELECT COALESCE(SUM(hours), 0) INTO v_total_hours
  FROM public.tm_ticket_entries
  WHERE tm_ticket_id = v_ticket_id;

  SELECT cap_hours, status INTO v_cap, v_current_status
  FROM public.tm_tickets
  WHERE id = v_ticket_id;

  IF v_current_status = 'open' AND v_total_hours >= v_cap THEN
    UPDATE public.tm_tickets
    SET hours_logged = v_total_hours, status = 'cap_reached'
    WHERE id = v_ticket_id;
  ELSE
    UPDATE public.tm_tickets
    SET hours_logged = v_total_hours
    WHERE id = v_ticket_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on tm_ticket_entries
CREATE TRIGGER trg_recalculate_tm_ticket_hours
  AFTER INSERT OR UPDATE OR DELETE ON public.tm_ticket_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_tm_ticket_hours();
