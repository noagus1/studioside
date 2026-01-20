-- Add stable icon_key to gear_types and backfill existing rows.
-- This decouples icon selection from user-editable names.

-- 1) Add icon_key column with a constrained set of values.
ALTER TABLE public.gear_types
  ADD COLUMN IF NOT EXISTS icon_key TEXT NOT NULL DEFAULT 'music';

ALTER TABLE public.gear_types
  ADD CONSTRAINT gear_types_icon_key_check
  CHECK (
    icon_key IN (
      'music',
      'mic',
      'interface',
      'outboard',
      'headphones',
      'mixer',
      'amp',
      'monitor',
      'fallback'
    )
  );

-- 2) Backfill icon_key for existing rows based on current names (one-time).
UPDATE public.gear_types
SET icon_key = CASE
  WHEN name ILIKE '%mic%' THEN 'mic'
  WHEN name ILIKE '%interface%' THEN 'interface'
  WHEN name ILIKE '%headphone%' THEN 'headphones'
  WHEN name ILIKE '%mixer%' THEN 'mixer'
  WHEN name ILIKE '%monitor%' OR name ILIKE '%speaker%' THEN 'monitor'
  WHEN name ILIKE '%outboard%' OR name ILIKE '%preamp%' THEN 'outboard'
  WHEN name ILIKE '%amp%' THEN 'amp'
  WHEN name ILIKE '%instrument%' OR name ILIKE '%keyboard%' OR name ILIKE '%piano%' THEN 'music'
  ELSE 'music'
END;

-- 3) Ensure future rows default to music and respect the check constraint (already enforced above).
