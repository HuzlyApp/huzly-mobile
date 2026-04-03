-- =============================================================================
-- Fix “no address / no coordinates” for Directions in the mobile app
-- =============================================================================
-- For NOT NULL facility_id, FK, CHECK, and same-client trigger, apply:
--   supabase/migrations/20260403120000_shifts_require_valid_facility.sql
-- Run in Supabase → SQL Editor (postgres role).
--
-- The app loads `public.facility` by `shifts.facility_id`. Directions need at
-- least one of: non-empty `address`, or both `lat` and `lng`.
--
-- 1) Fills missing coordinates (Iloilo City, PH demo pin) where lat/lng are NULL.
-- 2) Fills missing/blank `address` with a placeholder you can edit later.
-- 3) Links shifts with NULL `facility_id` to that client’s first facility (dev-friendly).
--
-- If the app loads the shift but directions still fail, the client often cannot
-- SELECT public.facility: run supabase/migrations/20260403121000_facility_select_for_browse.sql
-- =============================================================================

-- A) Coordinates missing
UPDATE public.facility
SET
  lat = COALESCE(lat, 10.7202),
  lng = COALESCE(lng, 122.5621),
  updated_at = now()
WHERE lat IS NULL OR lng IS NULL;

-- B) Address missing or blank (keeps existing address if already set)
UPDATE public.facility
SET
  address = COALESCE(NULLIF(trim(address), ''), 'JM Basa St, Iloilo City Proper, Iloilo City 5000, Philippines'),
  updated_at = now()
WHERE address IS NULL OR trim(coalesce(address, '')) = '';

-- C) Shifts with no facility: attach first facility for the same client (if any)
UPDATE public.shifts s
SET facility_id = sub.fid
FROM (
  SELECT DISTINCT ON (f.client_id) f.client_id, f.id AS fid
  FROM public.facility f
  ORDER BY f.client_id, f.created_at ASC NULLS LAST, f.id
) sub
WHERE s.facility_id IS NULL
  AND s.client_id = sub.client_id;

-- Optional: if you use the demo facility id from browse_demo_data.sql, force demo shifts
UPDATE public.shifts
SET facility_id = 'c0ffee01-0000-4000-8000-000000000001'
WHERE id IN (
  'c0ffee01-0000-4000-8000-000000000010',
  'c0ffee01-0000-4000-8000-000000000011'
)
AND EXISTS (
  SELECT 1 FROM public.facility f
  WHERE f.id = 'c0ffee01-0000-4000-8000-000000000001'
);
