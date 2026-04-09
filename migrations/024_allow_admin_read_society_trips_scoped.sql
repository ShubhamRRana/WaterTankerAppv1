-- Allow admins to read society_trips that belong to their agency (scoped by agency_admin_id).
-- This is required for the admin app Trip Details screen to show trips when RLS is enabled.
-- Safer than the old "Admins can read all society_trips" policy.

ALTER TABLE public.society_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read own society_trips" ON public.society_trips;
CREATE POLICY "Admins can read own society_trips"
  ON public.society_trips
  FOR SELECT
  TO authenticated
  USING (has_role('admin') AND agency_admin_id = auth.uid());

COMMENT ON POLICY "Admins can read own society_trips" ON public.society_trips
  IS 'Admin app: list society trips where agency_admin_id matches the logged-in admin user id.';

