-- =============================================================================
-- Let the mobile app read facility rows for open shifts (directions / job detail)
-- =============================================================================
-- Symptom: shift loads in the app but "Get directions" says there is no address
-- or facility — often shifts.facility_id is set while the separate query to
-- public.facility returns no rows (missing GRANT and/or RLS SELECT policy).
--
-- The app loads facility via `facility (...)` embedded on `shifts` and a fallback
-- `.from('facility')` query; both need SELECT permission for anon/authenticated.
--
-- Safe to re-run: idempotent policy name check.
-- =============================================================================

GRANT SELECT ON TABLE public.facility TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'facility'
      AND c.relrowsecurity
  )
     AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'facility'
      AND policyname = 'facility_select_referenced_by_shifts'
  ) THEN
    CREATE POLICY facility_select_referenced_by_shifts ON public.facility
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1
        FROM public.shifts s
        WHERE s.facility_id = facility.id
      )
    );
  END IF;
END $$;
