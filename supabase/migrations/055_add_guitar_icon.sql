-- Add guitar icon key and apply to Guitar gear type.

-- 1) Extend allowed icon keys to include guitar.
ALTER TABLE public.gear_types
  DROP CONSTRAINT IF EXISTS gear_types_icon_key_check;

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
      'fallback',
      'keyboard-music',
      'guitar'
    )
  );

-- 2) Ensure Guitar uses the guitar icon (idempotent).
UPDATE public.gear_types
SET icon_key = 'guitar'
WHERE name ILIKE 'guitar';
