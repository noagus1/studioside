-- RLS policies for new invoice schema

-- Enable RLS
ALTER TABLE public.invoice_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_details ENABLE ROW LEVEL SECURITY;

-- Invoice statuses: read-only lookup
DROP POLICY IF EXISTS "Anyone can read invoice statuses" ON public.invoice_statuses;
CREATE POLICY "Anyone can read invoice statuses"
  ON public.invoice_statuses
  FOR SELECT
  USING (true);

-- Invoice master (issued invoices)
DROP POLICY IF EXISTS "Members can view invoices in their current studio" ON public.invoice_master;
DROP POLICY IF EXISTS "Admins can insert invoices in their current studio" ON public.invoice_master;

CREATE POLICY "Members can view invoices in their current studio"
  ON public.invoice_master
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

CREATE POLICY "Admins can insert invoices in their current studio"
  ON public.invoice_master
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Invoice details (charges)
DROP POLICY IF EXISTS "Members can view invoice details in their current studio" ON public.invoice_details;
DROP POLICY IF EXISTS "Members can insert invoice details in their current studio" ON public.invoice_details;
DROP POLICY IF EXISTS "Admins can update invoice details in their current studio" ON public.invoice_details;
DROP POLICY IF EXISTS "Admins can delete invoice details in their current studio" ON public.invoice_details;

CREATE POLICY "Members can view invoice details in their current studio"
  ON public.invoice_details
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

CREATE POLICY "Members can insert invoice details in their current studio"
  ON public.invoice_details
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

CREATE POLICY "Admins can update pending invoice details in their current studio"
  ON public.invoice_details
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND invoice_id IS NULL
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND invoice_id IS NULL
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can delete pending invoice details in their current studio"
  ON public.invoice_details
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND invoice_id IS NULL
    AND public.is_studio_admin(public.current_studio_id())
  );
