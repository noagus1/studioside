-- Studio defaults stored per studio (session length, buffer)

CREATE TABLE IF NOT EXISTS public.studio_defaults (
  studio_id UUID PRIMARY KEY REFERENCES public.studios(id) ON DELETE CASCADE,
  default_session_length_hours INTEGER NOT NULL DEFAULT 2,
  default_buffer_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at fresh
CREATE TRIGGER set_studio_defaults_updated_at
  BEFORE UPDATE ON public.studio_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Ensure one row per studio
CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_defaults_studio_id ON public.studio_defaults(studio_id);

-- Backfill from existing studio columns, with a backend-owned 2h default
INSERT INTO public.studio_defaults (studio_id, default_session_length_hours, default_buffer_minutes)
SELECT
  s.id,
  COALESCE(s.default_session_length_hours, 2),
  COALESCE(s.default_buffer_minutes, 0)
FROM public.studios s
ON CONFLICT (studio_id) DO NOTHING;

-- RLS
ALTER TABLE public.studio_defaults ENABLE ROW LEVEL SECURITY;

-- Members can read defaults for the current studio
CREATE POLICY "Studio members can read studio_defaults for current studio"
  ON public.studio_defaults
  FOR SELECT
  USING (
    studio_id = current_studio_id()
    AND is_studio_member(current_studio_id())
  );

-- Admins/owners can insert/update defaults for the current studio
CREATE POLICY "Studio admins can upsert studio_defaults for current studio"
  ON public.studio_defaults
  FOR ALL
  USING (
    studio_id = current_studio_id()
    AND is_studio_admin(current_studio_id())
  )
  WITH CHECK (
    studio_id = current_studio_id()
    AND is_studio_admin(current_studio_id())
  );
