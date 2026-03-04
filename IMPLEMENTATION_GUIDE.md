# Implementation Guide: Align Supabase Auth Sign-Up

This guide provides **step-by-step instructions** to implement all audit recommendations.

---

## Phase 1: Database Setup (30 minutes)

### Step 1.1: Create Database Migration

1. In Supabase Dashboard: **SQL Editor**
2. Copy entire contents of [db/migrations/001_create_profiles_and_trigger.sql](db/migrations/001_create_profiles_and_trigger.sql)
3. Paste into SQL Editor
4. Click **Run**

**Verify:**
```sql
-- Check table exists
SELECT * FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'profiles';
-- Should return 1 row

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';
-- Should show: rowsecurity = true

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'users';
-- Should show: on_auth_user_created
```

### Step 1.2: Create Auth Scope Service Role (Optional)

For advanced features, create a separate service role token (use on backend only):

1. Supabase Dashboard → **Settings → API Tokens**
2. Create new token (don't copy to frontend — ever!)
3. Save for backend use only

**⚠️ Security:** Never use service role on client!

---

## Phase 2: Code Updates (1-2 hours)

### Step 2.1: Update auth.service.ts (Recommended)

**Option A: Full Enhancement (Recommended)**

Replace your existing [lib/auth/auth.service.ts](lib/auth/auth.service.ts) with content from [lib/auth/auth-enhanced.service.ts](lib/auth/auth-enhanced.service.ts):

```bash
# Copy enhanced version
cp src/lib/auth/auth-enhanced.service.ts src/lib/auth/auth.service.ts

# Update imports in files that use it
# (should be transparent — no changes needed)
```

**Changes:**
- ✅ Better error messages
- ✅ Profile creation fallback
- ✅ Input validation
- ✅ Better logging

**Option B: Minimal Update**

If you prefer minimal changes, add only the profile creation fallback to `signUpWithEmail()`:

```typescript
// After successful auth.signUp(), add:
if (userId) {
  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName.trim(),
        role,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.warn('[auth] Profile creation fallback:', profileError.message);
    }
  } catch (err) {
    console.warn('[auth] Profile creation fallback error:', err);
  }
}
```

### Step 2.2: Update worker-signup.tsx (Recommended)

Add profile verification before routing:

```typescript
// 1. Import getMyProfile
import { getMyProfile } from '@/lib/auth/profile.service';

// 2. Add state for verification
const [verifyingProfile, setVerifyingProfile] = useState(false);

// 3. Add verification function
const verifyProfileAndNavigate = async (redirectTo: string = '/onboarding-steps') => {
  setVerifyingProfile(true);
  try {
    const { data: profile, error } = await getMyProfile();

    if (error || !profile) {
      setErrorMsg('Profile creation failed. Please try again.');
      return false;
    }

    router.replace(redirectTo);
    return true;
  } finally {
    setVerifyingProfile(false);
  }
};

// 4. Call it after non-email-confirm signup
if (data?.needsEmailConfirm) {
  router.push(`/auth/confirm-email?email=${...}`);
} else {
  const success = await verifyProfileAndNavigate('/onboarding-steps');
  if (!success) return; // Error already displayed
}
```

**Or:** Replace entire file with [app/auth/worker-signup-enhanced.tsx](app/auth/worker-signup-enhanced.tsx)

### Step 2.3: Verify Other Files ✅

These files are **already aligned** and need no changes:

- ✅ `lib/config/supabase.ts` — Single client, good
- ✅ `lib/config/env.ts` — Env vars good
- ✅ `lib/auth/profile.service.ts` — Good as-is
- ✅ `hooks/use-auth-session.ts` — Good as-is
- ✅ `app/_layout.tsx` — Good as-is
- ✅ `app/auth/confirm-email.tsx` — Good as-is
- ✅ `app/auth/confirm-phone.tsx` — Good as-is

---

## Phase 3: Security Setup (30-45 minutes)

### Step 3.1: Enable RLS in Supabase Dashboard

1. Dashboard → **Database → Tables**
2. Click **profiles** table
3. Find **RLS** toggle on the right
4. Click toggle → "Enable RLS"
5. Confirm

### Step 3.2: Create RLS Policies (Dashboard Method)

**Policy 1: SELECT**

1. Click **+ Add RLS policy**
2. Choose **FOR SELECT**
3. Fill in:
   - **Policy name:** `Users can read their own profile`
   - **USING expression:** `auth.uid() = id`
4. Click **Save**

**Policy 2: UPDATE**

1. Click **+ Add RLS policy**
2. Choose **FOR UPDATE**
3. Fill in:
   - **Policy name:** `Users can update their own profile`
   - **USING expression:** `auth.uid() = id`
4. Click **Save**

**Verify:** You should see 2 policies listed for the profiles table

### Step 3.3: Create RLS Policies (SQL Method)

Alternatively, in **SQL Editor**, run:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

---

## Phase 4: Testing (1-2 hours)

### Test 4.1: Email Sign-Up (No Confirmation)

**Setup:** Ensure email confirmation is OFF in Supabase

**Steps:**
1. Open app in simulator/device
2. Navigate to sign-up screen
3. Enter:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "TestPassword123!"
   - Confirm: "TestPassword123!"
4. Tap **Sign Up**

**Expected:**
- ✅ `signUpWithEmail()` called
- ✅ Profile created (by trigger or fallback)
- ✅ Session created immediately (no confirmation needed)
- ✅ Routed to `/onboarding-steps`
- ✅ `useAuthSession` detects session, updates
- ✅ User info accessible in `getMyProfile()`

**Verify in Supabase:**
```sql
-- After sign-up, check both tables
SELECT id, email FROM auth.users COUNT;
-- Should show 1 new user

SELECT id, full_name, role FROM profiles;
-- Should show 1 new profile matching user id
```

### Test 4.2: Email Sign-Up (With Confirmation)

**Setup:** Enable email confirmation in Supabase Dashboard

**Steps:**
1. Navigate to sign-up screen
2. Enter same as above
3. Tap **Sign Up**

**Expected:**
- ✅ `needsEmailConfirm` returns true
- ✅ Routed to `/auth/confirm-email` screen
- ✅ User sees: "Check your email"

**Continue:**
1. In a test email account (or Supabase test mode), get confirmation link
2. Click link (should deep-link back into app)
3. `useAuthSession` detects session
4. Auto-route to `/onboarding-steps`

### Test 4.3: Phone Sign-Up

**Setup:** Ensure phone auth enabled in Supabase

**Steps:**
1. Navigate to sign-up screen
2. Switch to **Phone** tab
3. Enter: "202-555-0100" (will be converted to +12025550100)
4. Tap **Sign Up**

**Expected:**
- ✅ `signUpWithPhone()` called
- ✅ OTP sent via SMS (or test mode shows it)
- ✅ Routed to `/auth/confirm-phone`

**Continue:**
1. Enter OTP code (from SMS or test mode)
2. Tap **Verify**
3. `verifyPhoneOtp()` called
4. Session created
5. `useAuthSession` detects session
6. Auto-route to `/onboarding-steps`

### Test 4.4: RLS Policies

**Test SELECT Policy:**

In Supabase SQL Editor:

```sql
-- Sign up with first email, get user_id
SELECT id FROM auth.users WHERE email = 'test1@example.com';
-- Copy the id, let's call it: USER_1

-- Sign up with second email, get user_id
SELECT id FROM auth.users WHERE email = 'test2@example.com';
-- Copy the id, let's call it: USER_2

-- Now test RLS:

-- As USER_1, try to read USER_2's profile
SELECT * FROM profiles WHERE id = 'USER_2';
-- Result: (empty) ✅ RLS blocked it!

-- As USER_1, read own profile
SELECT * FROM profiles WHERE id = 'USER_1';
-- Result: (1 row) ✅ RLS allowed it!
```

**Test UPDATE Policy:**

```sql
-- As USER_1, try to update USER_2's profile
UPDATE profiles SET full_name = 'Hacker' WHERE id = 'USER_2';
-- Result: (0 rows affected) ✅ RLS blocked it!

-- As USER_1, update own profile
UPDATE profiles SET full_name = 'Real Name' WHERE id = 'USER_1';
-- Result: (1 row affected) ✅ RLS allowed it!
```

### Test 4.5: Profile Fetch After Sign-Up

In your app, after successful sign-up:

```typescript
// This should succeed
const { data: profile, error } = await getMyProfile();
console.log('Profile:', profile);
// Output:
// {
//   id: 'user123',
//   full_name: 'Test User',
//   role: 'worker',
//   onboarding_complete: false,
//   ...
// }
```

### Test 4.6: Error Scenarios

**Test 1: Duplicate Email**

1. Sign up with "test@example.com"
2. Try signing up again with same email
3. Expected: Error message "This email is already registered"

**Test 2: Weak Password**

1. Try signing up with password < 8 chars
2. Expected: Error message "Password must be at least 8 characters"

**Test 3: Invalid Email**

1. Try signing up with "notanemail"
2. Expected: Error message "Invalid email address"

**Test 4: Lost OTP (Phone)**

1. Sign up with phone
2. Let OTP expire (usually 10 minutes)
3. Try entering old OTP
4. Expected: Error message "Your OTP has expired"

---

## Phase 5: Deployment Preparation (30 minutes)

### Step 5.1: Environment Variables

**Verify .env has:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://hfjfxbhawzzylftvfdod.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Verify .gitignore includes:**
```bash
.env
.env.local
.env.*.local
```

### Step 5.2: Deep-Link Configuration

If using email confirmation, configure deep-link:

In `app.json`:
```json
{
  "scheme": "huzly",
  "plugins": [
    [
      "expo-router",
      {
        "origin": "huzly://"
      }
    ]
  ]
}
```

In Supabase Dashboard → **Auth → Email Templates:**
- Set redirect_to to match your deep-link scheme
- Example: `huzly://auth-callback`

### Step 5.3: Code Review Checklist

- [ ] No hardcoded URLs (use env vars)
- [ ] No service role key in client code
- [ ] All auth imports from `lib/config/supabase`
- [ ] Profile creation fallback in place
- [ ] RLS policies enabled
- [ ] User-friendly error messages
- [ ] Loading states for async operations
- [ ] Error handling for all API calls

### Step 5.4: Documentation

Add to your README or wiki:

```markdown
## Supabase Auth Setup

### Overview
- Uses Supabase Auth for email + phone sign-up
- Profiles automatically created via DB trigger
- RLS policies enforce user data isolation

### Key Files
- `lib/config/supabase.ts` — Supabase client
- `lib/auth/auth.service.ts` — Auth operations
- `lib/auth/profile.service.ts` — Profile CRUD
- `hooks/use-auth-session.ts` — Auth state

### Database
- Migration: `db/migrations/001_create_profiles_and_trigger.sql`
- RLS: See `RLS_POLICIES_AND_SECURITY.md`

### Env Vars
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Anon key

### Testing
See `SUPABASE_AUTH_AUDIT.md` section "Testing" for full test suite
```

---

## Phase 6: Monitoring (Ongoing)

### Monitor Auth Errors

In your error tracking service (e.g., Sentry):

```typescript
// Log auth errors
signUpWithEmail(...).then(({ error }) => {
  if (error) {
    console.error('[auth-error]', error);
    // Send to error tracking
  }
});
```

### Monitor RLS Denials

Check Supabase dashboard **Logs → Realtime** for:
- `code: "PGRST116"` — RLS denied access
- `code: "PGRST103"` — JWT invalid

### Audit Logs

Enable Supabase audit logs:

1. Dashboard → **Settings → Audit Logs**
2. Monitor auth sign-ups, profile changes
3. Alert on suspicious patterns

---

## Rollback Plan

If something goes wrong:

### Rollback Phase 1: Database

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop table
DROP TABLE IF EXISTS public.profiles CASCADE;
```

### Rollback Phase 2: Code

1. Revert code changes: `git revert <commit-hash>`
2. Clear cache: `npm run reset-project`
3. Reinstall: `npm install`

### Rollback Phase 3: RLS

```sql
-- Drop RLS policies
DROP POLICY "Users can read their own profile" ON public.profiles;
DROP POLICY "Users can update their own profile" ON public.profiles;

-- Disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
```

---

## Success Criteria

You're done when:

- ✅ Database trigger creates profiles automatically
- ✅ Email sign-up works (with and without confirmation)
- ✅ Phone sign-up and OTP verification work
- ✅ RLS policies prevent unauthorized data access
- ✅ User-friendly error messages display
- ✅ Profile retrieval succeeds after sign-up
- ✅ Sessions persist after app restart
- ✅ Sign-out clears session completely
- ✅ All imports use central Supabase client
- ✅ No mixed REST + Supabase calls

---

## Support

Issues?

1. Check [SUPABASE_AUTH_AUDIT.md](SUPABASE_AUTH_AUDIT.md) section "Troubleshooting"
2. Check [RLS_POLICIES_AND_SECURITY.md](RLS_POLICIES_AND_SECURITY.md) for security issues
3. Check Supabase Logs in dashboard
4. Search Supabase docs: https://supabase.com/docs/reference/javascript

