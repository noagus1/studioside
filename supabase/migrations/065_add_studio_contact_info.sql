-- Add contact email/phone fields to studios table
-- Nullable by default; used for outbound communications and contact display.

ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

COMMENT ON COLUMN public.studios.contact_email IS 'Primary contact email address for the studio';
COMMENT ON COLUMN public.studios.contact_phone IS 'Primary contact phone number for the studio';
