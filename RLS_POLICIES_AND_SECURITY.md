# Supabase RLS Policies & Security Guide

This guide covers Row-Level Security (RLS) policies needed for your Huzly app.

---

## What is RLS (Row-Level Security)?

**RLS** is a Postgres feature that enforces security at the database level. Each policy dictates who can access what data.

**Key principle:** Always assume `auth.uid()` (the authenticated user's ID) is the source of truth.

---

## Profile Table Policies

### Policy 1: Users Can Read Their Own Profile

```sql
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
```

**What it does:**
- Allows authenticated users to SELECT from `profiles`
- But ONLY rows where `id` matches their `auth.uid()`
- Example: User 123 can only see row with id=123

**Test:**
```sql
-- As user 123, this succeeds:
SELECT * FROM profiles WHERE id = '123';

-- As user 123, this fails (no rows returned):
SELECT * FROM profiles WHERE id = '456';
```

### Policy 2: Users Can Update Their Own Profile

```sql
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

**What it does:**
- Allows UPDATE on `profiles`
- But only for rows where `id` matches their `auth.uid()`
- Example: User 123 can update full_name, avatar_url, etc. but only on their own row

**Test:**
```sql
-- As user 123, this succeeds:
UPDATE profiles SET full_name = 'John Doe' WHERE id = '123';

-- As user 123, this fails (no rows affected):
UPDATE profiles SET full_name = 'Jane Doe' WHERE id = '456';
```

### Policy 3: Sign-Up Trigger Can Insert (DB-Level)

The `handle_new_user` trigger runs as the `postgres` role internally, which bypasses RLS. So we don't need an INSERT policy for the trigger — it's allowed by default.

However, if you later want to allow users to create their own profiles (unlikely), you'd add:

```sql
CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

---

## Implementation Steps (Supabase Dashboard)

### Step 1: Enable RLS
1. Go to **Supabase Dashboard → Database → Tables**
2. Click **profiles** table
3. Click **RLS** toggle on the right
4. Confirm: "Enable RLS"

### Step 2: Create SELECT Policy
1. Click **+ Add Policy**
2. Choose **FOR SELECT**
3. Fill in:
   - **Policy name:** `Users can read their own profile`
   - **USING expression:** `auth.uid() = id`
4. Click **Save**

### Step 3: Create UPDATE Policy
1. Click **+ Add Policy**
2. Choose **FOR UPDATE**
3. Fill in:
   - **Policy name:** `Users can update their own profile`
   - **USING expression:** `auth.uid() = id`
4. Click **Save**

---

## SQL Approach (Alternative)

If you prefer SQL, run these in the Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE policy
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

---

## Testing RLS Policies

### Test 1: Sign Up and Read Own Profile

```bash
# 1. Sign up with email (via your app)
# → Creates user 123ABC... 

# 2. In Supabase SQL editor, verify row was inserted:
SELECT id, full_name, role FROM profiles;
-- Should return one row with id = <your new user id>

# 3. In your app, call getMyProfile():
const { data } = await getMyProfile();
console.log(data); // Should return your profile
```

### Test 2: Try to Read Another User's Profile

```sql
-- Simulate being user ABC123
-- Try to read user XYZ789's profile

SELECT * FROM profiles WHERE id = 'XYZ789';
-- Should return: (empty result set)
-- ✅ RLS prevented unauthorized access!
```

### Test 3: Try to Update Another User's Profile

```sql
-- Simulate being user ABC123
UPDATE profiles SET full_name = 'Hacker' WHERE id = 'XYZ789';
-- Should return: (0 rows affected)
-- ✅ RLS prevented unauthorized update!
```

---

## Common RLS Mistakes

### ❌ Mistake 1: Forget to Enable RLS

```sql
-- WRONG
CREATE TABLE public.users (...);
-- Forgot: ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Result: Everyone can read everyone's data!
```

### ❌ Mistake 2: Policy with Wrong Column

```sql
-- WRONG
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = email);  -- ❌ Should be 'id', not 'email'

-- Result: Could match multiple rows if emails occur more than once
```

### ❌ Mistake 3: Policy Missing USING Clause

```sql
-- WRONG
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT;
-- Missing: USING (auth.uid() = id)

-- Result: Everyone can read everything!
```

### ❌ Mistake 4: Relying on Client-Side Checks

```typescript
// ❌ WRONG - Not safe!
const profile = await getProfile(userId); // No RLS
if (currentUser.id !== userId) {
  return; // Deny on client
}
// Someone could intercept and read other profiles!
```

**Always enforce at the DB level via RLS.**

---

## RLS + Auth State Flow

```
┌──────────────────────────────────────────────────────────┐
│ USER SIGNS UP                                             │
│ app.auth.signUp({ email, password, data: {...} })        │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │ Supabase Auth Service   │
        │ - Creates auth.users    │
        │ - Fires trigger         │
        └────────────┬────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ handle_new_user() Trigger    │
        │ - Runs as postgres role      │
        │ - Bypasses RLS              │
        │ - INSERT into profiles       │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ Session Created              │
        │ Browser/App has JWT token    │
        │ token includes sub = user_id │
        └────────────┬─────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Later: getMyProfile() called          │
    │                                      │
    │ const { data } = await supabase      │
    │   .from('profiles')                  │
    │   .select('*')                       │
    │   .single();                         │
    └───────────────┬──────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────┐
        │ Supabase Receives Request        │
        │ - Extracts JWT token from header │
        │ - Decodes: auth.uid() = 123ABC   │
        │ - Passes to RLS engine           │
        └────────────┬─────────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────────┐
    │ RLS Policy Evaluation:                    │
    │                                          │
    │ "Users can read their own profile"       │
    │ USING (auth.uid() = id)                  │
    │                                          │
    │ Check: Is 123ABC = 123ABC?               │
    │ Result: ✅ YES                           │
    │                                          │
    │ Return: That user's profile row          │
    └──────────────────────────────────────────┘
```

---

## RLS Policy Examples for Other Tables

### orders Table (User-Specific Data)

```sql
-- Users can only see their own orders
CREATE POLICY "Users can read their orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own orders
CREATE POLICY "Users can update their orders"
  ON public.orders
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### shifts Table (Public + Private Parts)

```sql
-- Anyone (authenticated) can see all shifts
CREATE POLICY "Anyone can read shifts"
  ON public.shifts
  FOR SELECT
  USING (true);

-- Only employers can create shifts
CREATE POLICY "Employers can create shifts"
  ON public.shifts
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'employer'
    )
  );
```

### admin_logs Table (Admin Only)

```sql
-- Only admins can access logs
CREATE POLICY "Admins can read logs"
  ON public.admin_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );
```

---

## Best Practices

### ✅ 1. Always Enable RLS on User-Related Tables

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
```

### ✅ 2. Use Descriptive Policy Names

```sql
-- GOOD
CREATE POLICY "Users can read their own profile" ...

-- BAD
CREATE POLICY "select_policy" ...
```

### ✅ 3. Test Policies in SQL Editor

```sql
-- Before deploying, test policies manually
SELECT * FROM profiles;  -- Only your own row should appear
```

### ✅ 4. Document RLS in Code Comments

```typescript
// src/lib/auth/profile.service.ts
/**
 * Get current user's profile.
 *
 * RLS Policy: "Users can read their own profile"
 *   USING (auth.uid() = id)
 *
 * This query is protected at the DB level — users cannot
 * access other users' profiles even if they know the ID.
 */
export async function getMyProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single();
  // ...
}
```

### ✅ 5. Use .single() or .limit(1) Carefully

```typescript
// ✅ OK - Only returns your own row
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)  // Add explicit filter
  .single();

// ⚠️ RISKY - Relies on RLS alone
const { data } = await supabase
  .from('profiles')
  .select('*')
  .single();  // Assumes RLS filters to one row
```

### ✅ 6. Log RLS Errors

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .single();

if (error) {
  console.error('Profile access error:', error);
  // Might indicate RLS denial
}
```

---

## Monitoring RLS Performance

RLS policies add database overhead. Monitor performance:

### Check Query Performance
```sql
-- In Postgres, check execution time
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM profiles;

-- Should be fast (<10ms) for typical queries
```

### Common Bottlenecks
1. **Multi-table joins in RLS:** Can be slow
   ```sql
   -- SLOW
   USING (
     auth.uid() IN (
       SELECT user_id FROM orders
     )
   )
   ```
   Fix: Denormalize or cache

2. **Subqueries in RLS:** Prefer simpler logic
   ```sql
   -- BETTER
   USING (
     auth.uid() = user_id AND
     status != 'deleted'
   )
   ```

---

## RLS Troubleshooting

### Issue: "Failed to fetch"

**Likely cause:** RLS denied access

```typescript
try {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single();

  if (error?.code === 'PGRST116') {
    // 0 rows returned — RLS filtered everything
    console.error('RLS denied access');
  }
} catch (err) {
  console.error('Query error:', err);
}
```

### Issue: Other User's Data Appears

**Likely cause:** RLS not enabled

```sql
-- Verify RLS is ON
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Should show: rowsecurity = true for all user tables
```

### Issue: Update Not Working

**Likely cause:** Missing UPDATE policy

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Ensure UPDATE policy exists
```

---

## Deployment Checklist

- [ ] RLS enabled on all user-related tables
- [ ] SELECT policy created (users can read own data)
- [ ] UPDATE policy created (users can update own data)
- [ ] Policies tested in SQL editor
- [ ] RLS rules documented in code comments
- [ ] Performance benchmarked (queries < 50ms)
- [ ] Error handling in place for RLS denials
- [ ] No sensitive data readable by admins unintentionally
- [ ] Trigger `handle_new_user` tested and verified

---

## Summary

RLS is **critical** to security. Without it, any user can read/write any data.

**Three words: Enable. Test. Deploy.**

