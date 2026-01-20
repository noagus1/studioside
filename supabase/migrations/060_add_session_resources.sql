-- Add structured resources to sessions for attaching gear with optional notes

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS resources JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sessions.resources IS 'Array of gear attachments for the session: [{ "gear_id": "<uuid>", "note": "<string|null>" }]';

