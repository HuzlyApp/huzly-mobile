-- =============================================================================
-- Shifts must reference a facility with enough location data for the mobile app
-- =============================================================================
-- Prerequisites: public.shifts (client_id, facility_id), public.facility,
-- public.clients as in SCHEMA.sql.
--
-- This migration:
--   1) Backfills incomplete facility rows (address / lat / lng).
--   2) Creates a default facility per client that has shifts but no facility row.
--   3) Points NULL or broken shift.facility_id at a valid facility for that client.
--   4) Adds FK shifts.facility_id → facility(id), NOT NULL, CHECK on facility,
--      and a trigger so facility.client_id matches shift.client_id.
--
-- Rollback (manual): drop trigger/function; ALTER shifts DROP CONSTRAINT ...;
--   ALTER facility DROP CONSTRAINT ...; ALTER shifts ALTER facility_id DROP NOT NULL;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Optional: inspect problems before changes (run in SQL editor if desired)
-- -----------------------------------------------------------------------------
-- See also: supabase/scripts/validate_shift_facilities.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 0b) Orphan shifts: every shifts.client_id must exist in public.clients
--     (otherwise INSERT facility fails with facility_client_id_fkey 23503)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  detail text;
BEGIN
  SELECT string_agg(sub.x, ', ' ORDER BY sub.x)
  INTO detail
  FROM (
    SELECT DISTINCT s.client_id::text AS x
    FROM public.shifts s
    WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = s.client_id)
  ) sub;

  IF detail IS NOT NULL AND btrim(detail) <> '' THEN
    RAISE EXCEPTION
      'shifts reference client_id not in public.clients: %. Create those client rows, set shifts.client_id to a valid client, or delete the orphan shifts — then re-run this migration.',
      detail;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1) Backfill facility coordinates + address (same intent as seed/fix_facility_locations.sql)
--     Default pin: Iloilo City Proper, Philippines
-- -----------------------------------------------------------------------------
UPDATE public.facility
SET
  lat = COALESCE(lat, 10.7202),
  lng = COALESCE(lng, 122.5621),
  updated_at = now()
WHERE lat IS NULL OR lng IS NULL;

UPDATE public.facility
SET
  address = COALESCE(NULLIF(btrim(address), ''), 'JM Basa St, Iloilo City Proper, Iloilo City 5000, Philippines'),
  updated_at = now()
WHERE address IS NULL OR btrim(coalesce(address, '')) = '';

UPDATE public.facility
SET
  name = COALESCE(NULLIF(btrim(name), ''), 'Workplace'),
  updated_at = now()
WHERE name IS NULL OR btrim(coalesce(name, '')) = '';

-- -----------------------------------------------------------------------------
-- 2) Default facility for any client that has shifts but zero facilities
-- -----------------------------------------------------------------------------
INSERT INTO public.facility (client_id, name, address, lat, lng)
SELECT DISTINCT s.client_id,
       'Default workplace (auto-created)',
       'JM Basa St, Iloilo City Proper, Iloilo City 5000, Philippines',
       10.7202,
       122.5621
FROM public.shifts s
INNER JOIN public.clients c ON c.id = s.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.facility f WHERE f.client_id = s.client_id
);

-- -----------------------------------------------------------------------------
-- 3) Shifts with NULL facility_id → first facility for that client (stable order)
-- -----------------------------------------------------------------------------
UPDATE public.shifts s
SET facility_id = sub.fid,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (f.client_id) f.client_id, f.id AS fid
  FROM public.facility f
  ORDER BY f.client_id, f.created_at ASC NULLS LAST, f.id
) sub
WHERE s.facility_id IS NULL
  AND s.client_id = sub.client_id;

-- -----------------------------------------------------------------------------
-- 4) Shifts whose facility_id does not exist → reassign to first facility for client
-- -----------------------------------------------------------------------------
UPDATE public.shifts s
SET facility_id = sub.fid,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (s2.id) s2.id AS shift_id, f.id AS fid
  FROM public.shifts s2
  INNER JOIN public.facility f ON f.client_id = s2.client_id
  WHERE s2.facility_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.facility fx WHERE fx.id = s2.facility_id)
  ORDER BY s2.id, f.created_at ASC NULLS LAST, f.id
) sub
WHERE s.id = sub.shift_id;

-- -----------------------------------------------------------------------------
-- 5) Re-ensure every facility still satisfies app rules after any edge-case data
-- -----------------------------------------------------------------------------
UPDATE public.facility
SET
  lat = COALESCE(lat, 10.7202),
  lng = COALESCE(lng, 122.5621),
  updated_at = now()
WHERE lat IS NULL OR lng IS NULL;

UPDATE public.facility
SET
  address = COALESCE(NULLIF(btrim(address), ''), 'JM Basa St, Iloilo City Proper, Iloilo City 5000, Philippines'),
  updated_at = now()
WHERE address IS NULL OR btrim(coalesce(address, '')) = '';

UPDATE public.facility
SET
  name = COALESCE(NULLIF(btrim(name), ''), 'Workplace'),
  updated_at = now()
WHERE name IS NULL OR btrim(coalesce(name, '')) = '';

-- -----------------------------------------------------------------------------
-- 6) Pre-flight: abort if any shift still has no facility
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  n_null integer;
  n_bad_ref integer;
BEGIN
  SELECT count(*) INTO n_null FROM public.shifts WHERE facility_id IS NULL;
  IF n_null > 0 THEN
    RAISE EXCEPTION 'shifts.facility_id still NULL for % row(s); add facilities for those clients.', n_null;
  END IF;

  SELECT count(*) INTO n_bad_ref
  FROM public.shifts s
  WHERE NOT EXISTS (SELECT 1 FROM public.facility f WHERE f.id = s.facility_id);
  IF n_bad_ref > 0 THEN
    RAISE EXCEPTION 'shifts.facility_id broken reference for % row(s).', n_bad_ref;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7) Foreign key: shifts.facility_id → facility(id)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.shifts'::regclass
      AND conname = 'shifts_facility_id_fkey'
  ) THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_facility_id_fkey
      FOREIGN KEY (facility_id) REFERENCES public.facility (id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8) NOT NULL facility_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.shifts
  ALTER COLUMN facility_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 9) Facility must expose at least one of: street address, valid lat/lng pair, or name
--     (matches mobile directions: geocode address, or coords, or "name, United States")
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.facility'::regclass
      AND conname = 'facility_has_location_identity_chk'
  ) THEN
    ALTER TABLE public.facility
      ADD CONSTRAINT facility_has_location_identity_chk CHECK (
        btrim(coalesce(address, '')) <> ''
        OR (
          lat IS NOT NULL
          AND lng IS NOT NULL
          AND lat::double precision >= -90
          AND lat::double precision <= 90
          AND lng::double precision >= -180
          AND lng::double precision <= 180
        )
        OR btrim(coalesce(name, '')) <> ''
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 10) Trigger: facility must belong to the same client as the shift
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_shift_facility_same_client ()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.facility f
    WHERE f.id = NEW.facility_id
      AND f.client_id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'shifts.facility_id must reference public.facility.id for the same client_id as the shift';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shifts_facility_same_client ON public.shifts;

CREATE TRIGGER trg_shifts_facility_same_client
BEFORE INSERT OR UPDATE OF facility_id, client_id ON public.shifts
FOR EACH ROW
EXECUTE PROCEDURE public.enforce_shift_facility_same_client ();

-- -----------------------------------------------------------------------------
-- 11) Post-migration sanity check (fails migration if invariant broken)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.shifts s
  LEFT JOIN public.facility f ON f.id = s.facility_id
  WHERE s.facility_id IS NULL
     OR f.id IS NULL
     OR NOT (
       btrim(coalesce(f.address, '')) <> ''
       OR (
         f.lat IS NOT NULL
         AND f.lng IS NOT NULL
         AND f.lat >= -90 AND f.lat <= 90
         AND f.lng >= -180 AND f.lng <= 180
       )
       OR btrim(coalesce(f.name, '')) <> ''
     );

  IF n > 0 THEN
    RAISE EXCEPTION 'Post-check failed: % shift(s) still lack a valid facility location identity.', n;
  END IF;
END $$;
