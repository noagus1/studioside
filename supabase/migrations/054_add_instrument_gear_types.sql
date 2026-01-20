-- Add instrument-focused gear types and allow new icon key.

-- 1) Allow keyboard icon key.
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
      'keyboard-music'
    )
  );

-- 2) Insert new gear types (idempotent).
INSERT INTO public.gear_types (name, icon_key)
VALUES
  ('Keyboards', 'keyboard-music'),
  ('Guitar', 'music')
ON CONFLICT (name) DO NOTHING;
