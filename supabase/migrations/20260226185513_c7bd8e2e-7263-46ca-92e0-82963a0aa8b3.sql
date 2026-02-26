ALTER TABLE public.po_line_items
  ADD COLUMN sov_line_id UUID REFERENCES public.sov_lines(id) ON DELETE SET NULL;

CREATE INDEX idx_po_line_items_sov_line_id ON public.po_line_items(sov_line_id);