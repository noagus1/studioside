-- Add last_updated_by field to track who made the most recent change
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_studios_last_updated_by ON public.studios(last_updated_by);

-- Add comment
COMMENT ON COLUMN public.studios.last_updated_by IS 'User ID of the person who last updated studio settings';
