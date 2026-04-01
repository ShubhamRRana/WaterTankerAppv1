-- After removing admin Trip Details screen: admins no longer need SELECT on all society_trips.
-- Customer-owned policies (select/insert/delete own) are unchanged.

DROP POLICY IF EXISTS "Admins can read all society_trips" ON public.society_trips;
