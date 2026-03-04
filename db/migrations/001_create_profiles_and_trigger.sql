-- ============================================================================
-- MIGRATION: 001_create_profiles_and_trigger.sql
-- ============================================================================
-- Purpose:
--   Create the `profiles` table and automatic trigger for user sign-up.
--   This trigger fires AFTER a new user is created in auth.users,
--   and automatically inserts a row into public.profiles.
--
-- Key Points:
--   - profiles.id is a UUID foreign key → auth.users.id
--   - ON DELETE CASCADE ensures cleanup
--   - Trigger runs as Postgres (bypasses RLS)
--   - RLS is then applied for client-side access
--
-- ============================================================================

-- Step 1: Create profiles table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User metadata from sign-up
  full_name TEXT,
  role TEXT CHECK (role IN ('worker', 'employer', NULL)),
  avatar_url TEXT,
  
  -- Onboarding tracking
  onboarding_complete BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete ON public.profiles(onboarding_complete);

-- Step 3: Enable RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policy - Users can read their own profile
-- ============================================================================
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Step 5: RLS Policy - Users can update their own profile
-- ============================================================================
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Step 6: Create trigger function
-- ============================================================================
-- Runs on auth.users INSERT and creates a corresponding profiles row.
-- The metadata (full_name, role) comes from auth.users.raw_user_meta_data
-- which was set during signUp() call.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role',
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;  -- Idempotent: don't error if already exists
  
  RETURN new;
END;
$$;

-- Step 7: Create trigger
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- DONE
-- ============================================================================
-- To roll back this migration (in reverse order):
-- 
-- DROP TRIGGER if exists on_auth_user_created ON auth.users;
-- DROP FUNCTION if exists public.handle_new_user();
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- DROP TABLE if exists public.profiles CASCADE;
--
-- ============================================================================
