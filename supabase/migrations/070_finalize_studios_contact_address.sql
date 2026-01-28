-- Finalize required studio contact/address fields and validation constraints

ALTER TABLE public.studios
  ALTER COLUMN contact_email SET NOT NULL,
  ALTER COLUMN street SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN country SET NOT NULL,
  ALTER COLUMN timezone SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'studios_contact_email_check'
      AND conrelid = 'public.studios'::regclass
  ) THEN
    ALTER TABLE public.studios
      ADD CONSTRAINT studios_contact_email_check
      CHECK (contact_email LIKE '%@%');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'studios_country_check'
      AND conrelid = 'public.studios'::regclass
  ) THEN
    ALTER TABLE public.studios
      ADD CONSTRAINT studios_country_check
      CHECK (char_length(country) = 2);
  END IF;
END $$;
