-- =============================================================================
-- Validate shifts ↔ facility location data (read-only)
-- =============================================================================
-- Run before or after migration 20260403120000_shifts_require_valid_facility.sql.
-- Expect: first query returns 0 rows after a successful migration + backfill.
-- =============================================================================

-- Shifts whose client_id is missing from public.clients (blocks facility insert / migration)
SELECT s.id AS shift_id, s.title, s.client_id
FROM public.shifts s
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = s.client_id)
ORDER BY s.created_at DESC NULLS LAST;

-- Rows that break mobile “directions” invariants
SELECT
  s.id AS shift_id,
  s.title,
  s.client_id,
  s.facility_id,
  f.name AS facility_name,
  f.address,
  f.lat,
  f.lng,
  CASE
    WHEN s.facility_id IS NULL THEN 'shift.facility_id is NULL'
    WHEN f.id IS NULL THEN 'facility row missing (broken FK or not loaded)'
    WHEN btrim(coalesce(f.address, '')) = ''
         AND (
           f.lat IS NULL
           OR f.lng IS NULL
           OR f.lat < -90 OR f.lat > 90
           OR f.lng < -180 OR f.lng > 180
         )
         AND btrim(coalesce(f.name, '')) = ''
      THEN 'facility has no address, no valid lat/lng, and no name'
    ELSE 'unknown'
  END AS problem
FROM public.shifts s
LEFT JOIN public.facility f ON f.id = s.facility_id
WHERE s.facility_id IS NULL
   OR f.id IS NULL
   OR (
     btrim(coalesce(f.address, '')) = ''
     AND (
       f.lat IS NULL
       OR f.lng IS NULL
       OR f.lat < -90 OR f.lat > 90
       OR f.lng < -180 OR f.lng > 180
     )
     AND btrim(coalesce(f.name, '')) = ''
   )
ORDER BY s.posted_at DESC NULLS LAST, s.created_at DESC NULLS LAST;

-- Summary counts
SELECT
  count(*) FILTER (WHERE s.facility_id IS NULL) AS shifts_null_facility,
  count(*) FILTER (WHERE s.facility_id IS NOT NULL AND f.id IS NULL) AS shifts_dangling_facility_id,
  count(*) FILTER (
    WHERE f.id IS NOT NULL
      AND btrim(coalesce(f.address, '')) = ''
      AND (
        f.lat IS NULL OR f.lng IS NULL
        OR f.lat < -90 OR f.lat > 90
        OR f.lng < -180 OR f.lng > 180
      )
      AND btrim(coalesce(f.name, '')) = ''
  ) AS shifts_with_facility_missing_all_location_hints
FROM public.shifts s
LEFT JOIN public.facility f ON f.id = s.facility_id;
