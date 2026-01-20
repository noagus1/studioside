-- Structured gear types and migration from free-text category
-- Adds a dedicated gear_types table, seeds fixed types, links gear.type_id, backfills, and removes the old category column.

-- 1) Create gear_types lookup table
CREATE TABLE IF NOT EXISTS public.gear_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current
DROP TRIGGER IF EXISTS set_gear_types_updated_at ON public.gear_types;
CREATE TRIGGER set_gear_types_updated_at
  BEFORE UPDATE ON public.gear_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2) Seed common gear types (idempotent)
INSERT INTO public.gear_types (name)
VALUES 
  ('microphone'),
  ('interface'),
  ('keyboard'),
  ('outboard'),
  ('monitor'),
  ('headphones'),
  ('mixer'),
  ('amp'),
  ('other')
ON CONFLICT (name) DO NOTHING;

-- 3) Add type_id FK to gear (nullable during migration)
ALTER TABLE public.gear
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.gear_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gear_type_id ON public.gear(type_id);

-- 4) Backfill type_id from existing category values where possible
UPDATE public.gear g
SET type_id = gt.id
FROM public.gear_types gt
WHERE gt.name = LOWER(TRIM(g.category))
  AND g.type_id IS NULL;

-- 5) Remove legacy free-text category column and index
DROP INDEX IF EXISTS idx_gear_category;
ALTER TABLE public.gear DROP COLUMN IF EXISTS category;
