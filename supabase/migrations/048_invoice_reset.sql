-- Reset invoice schema (data loss accepted). This migration drops legacy
-- invoice tables/sequence and rebuilds a minimal, auditable model:
--   - invoice_statuses (lookup)
--   - invoice_details (charges, pending or invoiced)
--   - invoice_master (issued invoices only)
--
-- Safe drop guidance (if you must keep history):
--   1) ALTER TABLE public.invoice_items RENAME TO invoice_items_legacy;
--   2) ALTER TABLE public.invoices RENAME TO invoices_legacy;
--   3) COMMENT the legacy tables with the archive date; stop writes to them.
--   4) Run this migration; legacy tables remain for read-only access.

-- Drop legacy invoice artifacts
DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS set_invoice_items_updated_at ON public.invoice_items;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP SEQUENCE IF EXISTS public.invoice_number_seq;

-- Lookup: invoice statuses
CREATE TABLE public.invoice_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO public.invoice_statuses (name)
VALUES ('to_invoice'), ('invoiced')
ON CONFLICT (name) DO NOTHING;

-- Helpers to reference seeded statuses in defaults
CREATE OR REPLACE FUNCTION public.invoice_status_to_invoice_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.invoice_statuses WHERE name = 'to_invoice';
$$;

CREATE OR REPLACE FUNCTION public.invoice_status_invoiced_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.invoice_statuses WHERE name = 'invoiced';
$$;

-- Master: issued invoices (immutable financial records)
CREATE TABLE public.invoice_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_master_number_check CHECK (invoice_number ~ '^[0-9]+$'),
  CONSTRAINT invoice_master_period_check CHECK (period_end >= period_start),
  UNIQUE (studio_id, invoice_number)
);

-- Details: billable charges (pending or invoiced)
CREATE TABLE public.invoice_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status_id UUID NOT NULL DEFAULT public.invoice_status_to_invoice_id() REFERENCES public.invoice_statuses(id),
  invoice_id UUID REFERENCES public.invoice_master(id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes to support common filters
CREATE INDEX idx_invoice_statuses_name ON public.invoice_statuses(name);

CREATE INDEX idx_invoice_details_studio_id ON public.invoice_details(studio_id);
CREATE INDEX idx_invoice_details_client_id ON public.invoice_details(client_id);
CREATE INDEX idx_invoice_details_status_id ON public.invoice_details(status_id);
CREATE INDEX idx_invoice_details_service_date ON public.invoice_details(service_date);
CREATE INDEX idx_invoice_details_invoice_id ON public.invoice_details(invoice_id);

CREATE INDEX idx_invoice_master_studio_id ON public.invoice_master(studio_id);
CREATE INDEX idx_invoice_master_client_id ON public.invoice_master(client_id);
CREATE INDEX idx_invoice_master_issued_at ON public.invoice_master(issued_at);
CREATE INDEX idx_invoice_master_period ON public.invoice_master(studio_id, period_start, period_end);
