-- Add notifications_enabled field to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- Update existing profiles to have notifications_enabled = true
UPDATE public.profiles
SET notifications_enabled = true
WHERE notifications_enabled IS NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.notifications_enabled IS 'Whether the user has notifications enabled';
