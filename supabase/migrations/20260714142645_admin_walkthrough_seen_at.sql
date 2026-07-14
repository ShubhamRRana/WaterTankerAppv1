ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS walkthrough_seen_at timestamptz NULL;

COMMENT ON COLUMN public.admins.walkthrough_seen_at IS
  'When the admin completed or skipped the first-login walkthrough; null means eligible for auto-start.';

UPDATE public.admins
SET walkthrough_seen_at = now()
WHERE walkthrough_seen_at IS NULL;
