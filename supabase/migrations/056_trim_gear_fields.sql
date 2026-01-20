-- Trim gear fields to essentials: keep brand, model, category only
-- This migration drops unused columns and the gear_status enum.

-- Drop indexes that depend on columns to be removed
DROP INDEX IF EXISTS idx_gear_status;
DROP INDEX IF EXISTS idx_gear_room_id;

-- Drop columns that are no longer needed
ALTER TABLE public.gear
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS room_id,
  DROP COLUMN IF EXISTS serial_number,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS last_service_date,
  DROP COLUMN IF EXISTS next_service_date,
  DROP COLUMN IF EXISTS photo_url;

-- Drop gear_status enum if nothing references it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gear_status') THEN
    -- Safety check: ensure no remaining columns use the type
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON a.attrelid = c.oid
      WHERE t.typname = 'gear_status'
        AND c.relkind = 'r'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) THEN
      DROP TYPE public.gear_status;
    END IF;
  END IF;
END $$;
