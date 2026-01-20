-- RLS Policies for invoices and invoice_items
-- Enforces studio scoping and admin-only mutation

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view invoices in their current studio" ON public.invoices;
DROP POLICY IF EXISTS "Admins can insert invoices in their current studio" ON public.invoices;
DROP POLICY IF EXISTS "Admins can update invoices in their current studio" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices in their current studio" ON public.invoices;

DROP POLICY IF EXISTS "Members can view invoice items in their current studio" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can insert invoice items in their current studio" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can update invoice items in their current studio" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can delete invoice items in their current studio" ON public.invoice_items;

-- Invoices policies
CREATE POLICY "Members can view invoices in their current studio"
  ON public.invoices
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

CREATE POLICY "Admins can insert invoices in their current studio"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can update invoices in their current studio"
  ON public.invoices
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can delete invoices in their current studio"
  ON public.invoices
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Invoice items policies
CREATE POLICY "Members can view invoice items in their current studio"
  ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.studio_id = public.current_studio_id()
    )
    AND public.is_studio_member(public.current_studio_id())
  );

CREATE POLICY "Admins can insert invoice items in their current studio"
  ON public.invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.studio_id = public.current_studio_id()
    )
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can update invoice items in their current studio"
  ON public.invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.studio_id = public.current_studio_id()
    )
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.studio_id = public.current_studio_id()
    )
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can delete invoice items in their current studio"
  ON public.invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.studio_id = public.current_studio_id()
    )
    AND public.is_studio_admin(public.current_studio_id())
  );



