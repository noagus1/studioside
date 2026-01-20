-- Add has_password flag to profiles table
-- This tracks whether a user has set a password for faster sign-in

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_has_password ON public.profiles(has_password);

-- Backfill existing users: check if they have email identity with password
-- Users with email identity that has encrypted_password set have a password
UPDATE public.profiles p
SET has_password = EXISTS (
  SELECT 1 
  FROM auth.users u
  JOIN auth.identities i ON u.id = i.user_id
  WHERE u.id = p.id
    AND i.provider = 'email'
    AND u.encrypted_password IS NOT NULL
    AND u.encrypted_password != ''
);








