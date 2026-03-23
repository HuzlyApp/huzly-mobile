-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  event_name text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.applicants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name text,
  email text,
  phone text,
  resume_url text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT applicants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.auth_trigger_logs (
  id bigint NOT NULL DEFAULT nextval('auth_trigger_logs_id_seq'::regclass),
  user_id uuid,
  detected_role text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  level text DEFAULT 'info'::text CHECK (level = ANY (ARRAY['info'::text, 'warn'::text, 'error'::text])),
  CONSTRAINT auth_trigger_logs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.client_required_docs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  facility_id uuid,
  file_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_required_docs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  company_name text,
  city text,
  state USER-DEFINED,
  zip_code text,
  lat double precision,
  verification_status text,
  rating numeric DEFAULT 0,
  total_shifts integer DEFAULT 0,
  w2_capable boolean DEFAULT false,
  preferred_classification text DEFAULT '1099'::text CHECK (preferred_classification = ANY (ARRAY['1099'::text, 'W2'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  onboarding_status text DEFAULT 'pending'::text,
  onboarding_step integer DEFAULT 0,
  onboarding_started_at timestamp with time zone DEFAULT now(),
  onboarding_completed_at timestamp with time zone,
  ein_number text,
  address text,
  lng double precision,
  location USER-DEFINED,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_url text NOT NULL,
  effective_date date,
  expiry_date date,
  uploaded_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  admin_notes text,
  CONSTRAINT credentials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.data_exports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  format text CHECK (format = ANY (ARRAY['CSV'::text, 'JSON'::text, 'SQL'::text])),
  status text DEFAULT 'Pending'::text CHECK (status = ANY (ARRAY['Pending'::text, 'Processing'::text, 'Done'::text, 'Failed'::text])),
  file_url text,
  requested_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT data_exports_pkey PRIMARY KEY (id),
  CONSTRAINT data_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  week_number integer CHECK (week_number >= 1),
  reason text NOT NULL,
  details text,
  proof_files ARRAY,
  ai_verdict text,
  resolved boolean DEFAULT false,
  resolution text,
  submitted_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  occurred_at timestamp with time zone DEFAULT now(),
  CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facility (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  name text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  about text,
  required_credentials ARRAY,
  is_headquarters boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT facility_pkey PRIMARY KEY (id),
  CONSTRAINT facility_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.gps_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  user_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  action USER-DEFINED NOT NULL,
  recorded_at timestamp with time zone DEFAULT now(),
  gps_spoofing_score numeric CHECK (gps_spoofing_score >= 0::numeric AND gps_spoofing_score <= 1::numeric),
  ai_compliance_check jsonb,
  CONSTRAINT gps_logs_pkey PRIMARY KEY (id),
  CONSTRAINT gps_logs_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  stripe_invoice_id text,
  issued_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id)
);
CREATE TABLE public.job_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  active boolean,
  CONSTRAINT job_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.job_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name text NOT NULL,
  requires_license boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_roles_pkey PRIMARY KEY (id),
  CONSTRAINT job_roles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.job_categories(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  shift_id uuid,
  sender_id uuid,
  receiver_id uuid,
  content text,
  attachments jsonb,
  is_read boolean DEFAULT false,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type text,
  title text,
  body text,
  is_read boolean DEFAULT false,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.overtime_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  user_id uuid NOT NULL,
  hours double precision NOT NULL CHECK (hours > 0::double precision),
  reason text,
  logged_at timestamp with time zone DEFAULT now(),
  CONSTRAINT overtime_logs_pkey PRIMARY KEY (id),
  CONSTRAINT overtime_logs_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  last4 text CHECK (char_length(last4) = 4),
  added_at timestamp with time zone DEFAULT now(),
  provider text DEFAULT 'stripe'::text,
  provider_payment_method_id text,
  is_default boolean DEFAULT false,
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  week_number integer NOT NULL CHECK (week_number >= 1),
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  released boolean DEFAULT false,
  release_scheduled timestamp with time zone,
  released_at timestamp with time zone,
  stripe_transfer_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  rated_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  tags ARRAY,
  comment text,
  ai_summary text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ratings_pkey PRIMARY KEY (id),
  CONSTRAINT ratings_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  generated_by uuid NOT NULL,
  type text,
  file_url text,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id)
);
CREATE TABLE public.requirement_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon_url text,
  est_time_min integer DEFAULT 0 CHECK (est_time_min >= 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT requirement_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shift_cancellations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL UNIQUE,
  canceled_by USER-DEFINED NOT NULL,
  reason text,
  forfeit_amount numeric CHECK (forfeit_amount >= 0::numeric),
  canceled_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_cancellations_pkey PRIMARY KEY (id),
  CONSTRAINT shift_cancellations_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.shift_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  requirement_type_id uuid NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_requirements_pkey PRIMARY KEY (id),
  CONSTRAINT shift_requirements_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT shift_requirements_requirement_type_id_fkey FOREIGN KEY (requirement_type_id) REFERENCES public.requirement_types(id)
);
CREATE TABLE public.shift_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  template_name text NOT NULL,
  serialized_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  facility_id uuid,
  title text,
  description text,
  start_date date,
  end_date date,
  rate_per_hour numeric CHECK (rate_per_hour > 0::numeric),
  total_escrow numeric CHECK (total_escrow >= 0::numeric),
  escrow_paid boolean DEFAULT false,
  posted_at timestamp with time zone DEFAULT now(),
  claimed_at timestamp with time zone,
  completed_at timestamp with time zone,
  payroll_provider text DEFAULT 'Huzly'::text,
  ai_fill_probability numeric CHECK (ai_fill_probability >= 0::numeric AND ai_fill_probability <= 1::numeric),
  ai_suggested_rate_increase numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  job_category_id uuid,
  weeks integer,
  number_of_people_needed bigint,
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_job_category_id_fkey FOREIGN KEY (job_category_id) REFERENCES public.job_categories(id)
);
CREATE TABLE public.skill_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  category text,
  answers jsonb,
  created_at timestamp without time zone DEFAULT now(),
  completed boolean DEFAULT false,
  CONSTRAINT skill_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT skill_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.skill_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  order_number integer,
  created_at timestamp without time zone DEFAULT now(),
  slug text,
  CONSTRAINT skill_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.skill_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  question text NOT NULL,
  quiz_number integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT skill_questions_pkey PRIMARY KEY (id),
  CONSTRAINT skill_questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.skill_categories(id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.state_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  required boolean DEFAULT true,
  rules text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT state_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  stripe_subscription_id text,
  start_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  subject text,
  description text,
  status text DEFAULT 'Open'::text CHECK (status = ANY (ARRAY['Open'::text, 'In Progress'::text, 'Resolved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text,
  first_name text,
  role USER-DEFINED NOT NULL,
  sector_preference USER-DEFINED,
  profile_photo text,
  bio text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  preferred_contact USER-DEFINED,
  notification_prefs ARRAY DEFAULT '{}'::text[],
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  push_token text,
  timezone USER-DEFINED,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  onboarding_step integer DEFAULT 0,
  onboarding_completed boolean DEFAULT false,
  last_name text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_fk FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status_code integer,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.worker (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  address_raw text,
  address2 text,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  address_status USER-DEFINED,
  rating numeric DEFAULT 0,
  total_shifts integer DEFAULT 0,
  no_shows integer DEFAULT 0,
  trust_score numeric,
  trust_updated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  onboarding_status text DEFAULT 'pending'::text,
  onboarding_step integer DEFAULT 0,
  job_categories text,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  roles_text text,
  stripe_account_id text,
  worker_type text,
  experience_years integer,
  status text DEFAULT 'Active'::text,
  success_rate numeric DEFAULT 
CASE
    WHEN (total_shifts = 0) THEN (0)::numeric
    ELSE (((total_shifts - no_shows))::numeric / (total_shifts)::numeric)
END,
  location USER-DEFINED,
  positions ARRAY NOT NULL DEFAULT '{}'::text[],
  first_name text,
  address1 text,
  phone text,
  email text,
  job_role text,
  last_name text,
  CONSTRAINT worker_pkey PRIMARY KEY (id)
);
CREATE TABLE public.worker_availability (
  worker_id uuid NOT NULL,
  is_available boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  lat double precision,
  lng double precision,
  CONSTRAINT worker_availability_pkey PRIMARY KEY (worker_id),
  CONSTRAINT worker_availability_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker(id)
);
CREATE TABLE public.worker_category_roles (
  id bigint NOT NULL DEFAULT nextval('worker_category_roles_id_seq'::regclass),
  worker_id uuid NOT NULL,
  job_category_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worker_category_roles_pkey PRIMARY KEY (id),
  CONSTRAINT worker_category_roles_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker(id),
  CONSTRAINT worker_category_roles_job_category_id_fkey FOREIGN KEY (job_category_id) REFERENCES public.job_categories(id)
);
CREATE TABLE public.worker_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  worker_id uuid,
  document_name text,
  signed boolean DEFAULT false,
  signed_at timestamp without time zone,
  document_url text,
  ssn_url text,
  drivers_license_url text,
  CONSTRAINT worker_documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.worker_references (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  applicant_id uuid NOT NULL,
  reference_first_name text NOT NULL,
  reference_last_name text NOT NULL,
  reference_phone text,
  reference_email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT worker_references_pkey PRIMARY KEY (id)
);
CREATE TABLE public.worker_requirements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  worker_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  drivers_license_path text,
  resume_path text,
  job_certificate_path text,
  updated_at timestamp with time zone DEFAULT now(),
  drug_test_results_path text,
  w9_path text,
  ssn_card_path text,
  CONSTRAINT worker_requirements_pkey PRIMARY KEY (id),
  CONSTRAINT worker_requirements_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES auth.users(id)
);
CREATE TABLE public.worker_shift_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  shift_requirement_id uuid NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT worker_shift_requirements_pkey PRIMARY KEY (id),
  CONSTRAINT worker_shift_requirements_shift_requirement_id_fkey FOREIGN KEY (shift_requirement_id) REFERENCES public.shift_requirements(id)
);