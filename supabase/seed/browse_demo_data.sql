-- =============================================================================
-- Huzly mobile — Browse / shift detail demo data
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (uses postgres role; bypasses RLS).
--
-- Prerequisite: at least one row in public.users (your app usually creates this
-- when a user signs up; public.users.id must match auth.users.id per schema).
--
-- Idempotent: safe to re-run. Fixed UUIDs used for facility + shifts so the app
-- can bookmark them; client/job category use upsert by natural keys where needed.
-- =============================================================================

DO $$
DECLARE
  v_user uuid;
  v_client uuid;
  v_facility uuid := 'c0ffee01-0000-4000-8000-000000000001';
  v_category uuid;
  v_shift_open uuid := 'c0ffee01-0000-4000-8000-000000000010';
  v_shift_full uuid := 'c0ffee01-0000-4000-8000-000000000011';
  rt_pol uuid;
  rt_bg uuid;
  rt_i9 uuid;
BEGIN
  SELECT u.id
  INTO v_user
  FROM public.users u
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION
      'public.users is empty. Sign in once with the mobile app (or insert a public.users row linked to auth.users), then run this script again.';
  END IF;

  INSERT INTO public.clients (user_id, company_name)
  VALUES (v_user, 'Iloilo Demo Employer (PH)')
  ON CONFLICT (user_id) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      updated_at = now()
  RETURNING id INTO v_client;

  INSERT INTO public.facility (
    id,
    client_id,
    name,
    address,
    lat,
    lng,
    required_credentials
  )
  VALUES (
    v_facility,
    v_client,
    'Iloilo Demo Warehouse',
    'JM Basa St, Iloilo City Proper, Iloilo City 5000, Philippines',
    10.7202,
    122.5621,
    ARRAY['Steel-toe boots', 'Hi-vis vest']::text[]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    client_id = EXCLUDED.client_id,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    required_credentials = EXCLUDED.required_credentials,
    updated_at = now();

  INSERT INTO public.job_categories (name, active)
  VALUES ('General Labor (Seed)', true)
  ON CONFLICT (name) DO UPDATE
  SET active = COALESCE(EXCLUDED.active, public.job_categories.active)
  RETURNING id INTO v_category;

  -- Open shift: multi-day, slots available, shows Browse + detail + schedules
  INSERT INTO public.shifts (
    id,
    client_id,
    facility_id,
    title,
    description,
    start_date,
    end_date,
    rate_per_hour,
    total_escrow,
    job_category_id,
    weeks,
    number_of_people_needed,
    completed_at
  )
  VALUES (
    v_shift_open,
    v_client,
    v_facility,
    'General Laborer',
    'Unload trucks, stack pallets, and follow the site lead. Arrive 15 minutes early for check-in.',
    CURRENT_DATE,
    CURRENT_DATE + 70,
    25.12,
    10515.40,
    v_category,
    10,
    3,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET
    client_id = EXCLUDED.client_id,
    facility_id = EXCLUDED.facility_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    rate_per_hour = EXCLUDED.rate_per_hour,
    total_escrow = EXCLUDED.total_escrow,
    job_category_id = EXCLUDED.job_category_id,
    weeks = EXCLUDED.weeks,
    number_of_people_needed = EXCLUDED.number_of_people_needed,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();

  -- Full shift: waitlist banner + disabled book in the app
  INSERT INTO public.shifts (
    id,
    client_id,
    facility_id,
    title,
    description,
    start_date,
    end_date,
    rate_per_hour,
    total_escrow,
    job_category_id,
    weeks,
    number_of_people_needed,
    completed_at
  )
  VALUES (
    v_shift_full,
    v_client,
    v_facility,
    'Warehouse Associate (Full)',
    'Demo shift with no open slots (waitlist UI). Same site as General Laborer demo.',
    CURRENT_DATE + 1,
    CURRENT_DATE + 14,
    22.00,
    2464.00,
    v_category,
    2,
    0,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET
    client_id = EXCLUDED.client_id,
    facility_id = EXCLUDED.facility_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    rate_per_hour = EXCLUDED.rate_per_hour,
    total_escrow = EXCLUDED.total_escrow,
    job_category_id = EXCLUDED.job_category_id,
    weeks = EXCLUDED.weeks,
    number_of_people_needed = EXCLUDED.number_of_people_needed,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();

  INSERT INTO public.requirement_types (name, est_time_min)
  VALUES
    ('Review Warehouse Policies', 1),
    ('Background check', 1),
    ('I-9 Verification', 5)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO rt_pol FROM public.requirement_types WHERE name = 'Review Warehouse Policies' LIMIT 1;
  SELECT id INTO rt_bg FROM public.requirement_types WHERE name = 'Background check' LIMIT 1;
  SELECT id INTO rt_i9 FROM public.requirement_types WHERE name = 'I-9 Verification' LIMIT 1;

  IF rt_pol IS NULL OR rt_bg IS NULL OR rt_i9 IS NULL THEN
    RAISE EXCEPTION 'requirement_types seed mismatch (expected three named types).';
  END IF;

  DELETE FROM public.worker_shift_requirements wsr
  USING public.shift_requirements sr
  WHERE wsr.shift_requirement_id = sr.id
    AND sr.shift_id IN (v_shift_open, v_shift_full);

  DELETE FROM public.shift_requirements
  WHERE shift_id IN (v_shift_open, v_shift_full);

  INSERT INTO public.shift_requirements (shift_id, requirement_type_id, description)
  VALUES
    (v_shift_open, rt_pol, 'Read a few slides'),
    (v_shift_open, rt_bg, 'Read a few slides'),
    (v_shift_open, rt_i9, 'Verify your work eligibility by completing the I-9 form.'),
    (v_shift_full, rt_pol, 'Read a few slides'),
    (v_shift_full, rt_bg, 'Read a few slides'),
    (v_shift_full, rt_i9, 'Verify your work eligibility by completing the I-9 form.');

  RAISE NOTICE 'Browse demo OK. user=% client=% facility=% category=% shifts=[%, %]',
    v_user, v_client, v_facility, v_category, v_shift_open, v_shift_full;
END $$;
