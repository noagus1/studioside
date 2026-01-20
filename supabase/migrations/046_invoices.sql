-- Invoices and Invoice Items tables
-- Provides studio-scoped invoice records with line items and payment metadata

-- Sequence for human-friendly invoice numbers (INV-000001, etc.)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT (
    'INV-' || LPAD(nextval('invoice_number_seq')::text, 6, '0')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  currency TEXT NOT NULL DEFAULT 'usd',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  memo TEXT,
  notes TEXT,
  payment_link_url TEXT,
  pdf_url TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_name TEXT,
  customer_email TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoice Items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
  tax_rate NUMERIC(6, 3) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_studio_id ON public.invoices(studio_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- Indexes for invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sort_order ON public.invoice_items(sort_order);

-- updated_at triggers
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_invoice_items_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.invoices IS 'Studio-scoped invoices with payment metadata';
COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';



