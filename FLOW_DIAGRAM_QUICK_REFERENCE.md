# Supabase Auth Sign-Up Flow Diagram & Quick Reference

## 1. Complete Auth Flow (Visual)

```
USER OPENS APP
        │
        ▼
┌───────────────────────────────────┐
│  RootLayout (_layout.tsx)         │
│  - Calls useAuthSession() hook    │
│  - Waits for session check        │
└────────┬────────────────────────┬─┘
         │                        │
    ┌────▼───────┐          ┌────▼────────┐
    │ Session?   │          │ Hide splash │
    └────┬───────┘          │ screen      │
         │ YES              └─────────────┘
    ┌────┴──────────────┬──────────────────┐
    │                   │                  │
    ▼                   ▼                  ▼
┌──────────┐       ┌──────────┐      ┌─────────┐
│ (tabs)   │       │ Wait...  │      │ welcome │
│ main app │       │ loading  │      │ screen  │
└──────────┘       └──────────┘      └────┬────┘
                                          │
                                ┌─────────┴──────────┐
                                │                    │
                                ▼                    ▼
                           ┌─────────┐         ┌────────┐
                           │ Sign In │         │ Sign Up│
                           │ screen  │         │ screen │
                           └─────────┘         └────┬───┘
                                                    │
                                    ┌───────────────┴────────────┐
                                    │                            │
                                    ▼                            ▼
                            ┌──────────────┐          ┌─────────────────┐
                            │  EMAIL MODE  │          │   PHONE MODE    │
                            │              │          │                 │
                            │ - Full name  │          │ - Phone number  │
                            │ - Email      │          │   (10 digits)   │
                            │ - Password   │          │                 │
                            │ - Confirm pw │          └────────┬────────┘
                            └──────┬───────┘                   │
                                   │                           │
                    ┌──────────────▼──────────────┐            │
                    │  Tap "Sign Up" button       │            │
                    └──────────────┬──────────────┘            │
                                   │                           │
                    ┌──────────────▼───────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │ signUpWithEmail()         │
        │ or                        │
        │ signUpWithPhone()         │
        └──────────┬───────────────┘
                   │
        ┌──────────▼──────────┐
        │  Supabase.auth.*    │
        │  - Creates auth user│
        │  - Returns session  │
        │    (or null)        │
        │  - Fires trigger    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  handle_new_user()  │
        │  Postgres trigger   │
        │  - Inserts row into │
        │    public.profiles  │
        └─────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    EMAIL MODE          PHONE MODE
    │                   │
    ▼                   ▼
  Needs           Needs OTP
  Confirm?        Verification
  │               │
  ├─YES           └──→ Show OTP Entry
  │               Screen
  ├─→ Route to ──→ User enters
  │  confirm-    code from SMS
  │  email       │
  │  screen      ▼
  │              verifyPhoneOtp()
  │              │
  │              ▼
  │          Session created
  │          │
  │   ┌──────┴──────┐
  │   │ onAuthState │
  │   │ Change fires│
  │   └──────┬──────┘
  │          │
  │   ┌──────▼────────────┐
  │   │ Root layout       │
  │   │ detects session   │
  │   │ routes to app    │
  │   └───────────────────┘
  │
  └─NO
    │
    ▼
  Session
  created
  immediately
  │
  ▼
  (Optional) Verify
  profile exists
  via getMyProfile()
  │
  ▼
  Route to
  /onboarding-steps
  │
  ▼
  onAuthStateChange
  fires
  │
  ▼
  Root layout detects
  session, routes to
  /(tabs)
```

---

## 2. File Dependencies

```
┌───────────────────────────────────────────────────────────┐
│                     App Root                              │
│                  (_layout.tsx)                            │
└────────────┬──────────────────────────────────────────────┘
             │
    ┌────────▼───────────────┐
    │  useAuthSession hook   │
    │  (use-auth-session.ts) │
    └────────┬───────────────┘
             │
    ┌────────▼────────────────────────┐
    │  supabase client                │
    │  (lib/config/supabase.ts)  ◄────┼─────┐
    └────────┬─────────────────────────┘     │
             │                               │
    ┌────────▼──────────────────┐            │
    │ onAuthStateChange()       │            │
    │ tracks session            │            │
    └────────┬──────────────────┘            │
             │                               │
    ┌────────▼─────────────────────────────┐ │
    │         Sign-Up Screen                │ │
    │    (app/auth/worker-signup.tsx)       │ │
    └────────┬──────────────────────────────┘ │
             │                                │
    ┌────────▼─────────────────────────┐     │
    │  signUpWithEmail() or            │     │
    │  signUpWithPhone()               │     │
    │  (lib/auth/auth.service.ts) ◄────┼─────┤
    └────────┬──────────────────────────┘     │
             │                                │
    ┌────────▼────────────────────┐          │
    │  getMyProfile()             │          │
    │  (lib/auth/profile.service) ◄──────────┤
    └────────┬─────────────────────┘          │
             │                                │
    ┌────────▼─────────────────────────┐     │
    │  Supabase JS Client              │◄────┘
    │  (supabase.from(),               │
    │   supabase.auth.*)               │
    └────────┬─────────────────────────┘
             │
    ┌────────▼───────────────────────┐
    │  Supabase Backend               │
    │  - auth.users table             │
    │  - public.profiles table        │
    │  - Triggers                     │
    │  - RLS policies                 │
    └─────────────────────────────────┘
```

---

## 3. Data Flow: Email Sign-Up

```
Frontend                          Backend (Supabase)
────────────────────────────────────────────────────────

User fills form
│
├─ Full Name: "John"
├─ Email: "john@example.com"
├─ Password: "Secure123!"
└─ Role: "worker"
    │
    ▼
signUpWithEmail()
    │
    ├─ Normalize email (lowercase, trim)
    ├─ Create payload
    │  {
    │    email: "john@example.com",
    │    password: "Secure123!",
    │    data: {
    │      full_name: "John",
    │      role: "worker"
    │    }
    │  }
    │
    ▼
supabase.auth.signUp()  ─────────────────────────▶  auth.users table
                        ◀─ Returns: {               │
                            user: { id, email },    │ INSERT
                            session?: { ... }  ─────┼─► session created?
                          }                         │
    │
    ├─ Extract userId
    ├─ Check: session === null?
    │ (if null → email confirmation required)
    │
    ▼  (Trigger fires async)
[Trigger: handle_new_user]  ──────────────────────▶ public.profiles table
    │                                               │
    │ Extracts from auth.users.raw_user_meta_data  │ INSERT
    │ - full_name: "John"                           │
    │ - role: "worker"                              │
    │                                               │
    ▼                                               ▼
Return: {                                   ┌─────────────────┐
  data: {                                   │ id | full_name  │
    needsEmailConfirm: false/true,          │ ---|─────────────│
    userId: "123abc..."                     │123 │ John        │
  },                                        └─────────────────┘
  error: null
}
    │
    ├─ if needsEmailConfirm
    │  └─ Route to /auth/confirm-email
    │
    └─ else
       ├─ (Option 1) Route immediately to /onboarding-steps
       │  (user is signed in automatically)
       │
       └─ (Option 2) Verify profile exists first
          ├─ Call getMyProfile()  ────────▶ SELECT * FROM profiles
          │                        ◀────── WHERE id = auth.uid()
          │                               (RLS enforces this)
          │
          ├─ Confirm profile returned
          └─ Route to /onboarding-steps
```

---

## 4. Data Flow: Phone Sign-Up

```
Frontend                          Backend (Supabase)
────────────────────────────────────────────────────────

User enters phone
│
├─ Formatted: "+1-202-555-0100"
└─ Converted to: "+12025550100" (E.164)
    │
    ▼
signUpWithPhone()
    │
    ├─ Create payload
    │  {
    │    phone: "+12025550100",
    │    data: { role: "worker" }
    │  }
    │
    ▼
supabase.auth.signInWithOtp()  ─────▶  Twilio/AWS SNS
                                │
                                ▼
                            Send SMS:
                            "Your code: 123456"
    │
    ◀────────────── Returned { error: null | error }
    │
    ├─ if error
    │  └─ Show error, ask retry
    │
    ▼
Route to /auth/confirm-phone screen
    │
    User enters code from SMS
    │
    ▼
verifyPhoneOtp()
    │
    ├─ Create payload
    │  {
    │    phone: "+12025550100",
    │    token: "123456",
    │    type: "sms"
    │  }
    │
    ▼
supabase.auth.verifyOtp()  ──────▶  Verify against SMS code
                                   │
                                   │ CREATE session
                                   │
                                   ├─ auth.users row created
                                   │  (if first time)
                                   │
                                   │ Trigger fires:
                                   ▼ INSERT into profiles
          ◀─ Returns session
    │
    ├─ onAuthStateChange fires in background
    │
    ▼
Root layout detects new session
    │
    ▼
Route to /(tabs) or /onboarding-steps
```

---

## 5. Critical Junctures (Error Handling Points)

```
                       ┌─ Email already registered?
                       │  ────▶ Show: "Email already registered"
                       │
signUpWithEmail() ─────┼─ Invalid email?
                       │  ────▶ Show: "Invalid email address"
                       │
                       └─ Weak password?
                          ────▶ Show: "Password too weak"


                       ┌─ Invalid phone format?
signUpWithPhone() ─────┼─ OTP delivery failed?
                       │  ────▶ Show: "Could not send SMS"
                       │
                       └─ Phone already used?
                          ────▶ Show: "Phone already registered"


                       ┌─ OTP expired (>10 min)?
verifyPhoneOtp()  ─────┼─ Invalid OTP code?
                       │  ────▶ Show: "Invalid or expired code"
                       │
                       └─ Network error?
                          ────▶ Show: "Connection failed, try again"


                       ┌─ Profile not found?
getMyProfile() ────────┤  (indicates DB trigger failed)
                       │  ────▶ Show: "Profile creation failed"
                       │
                       └─ RLS denied access?
                          (auth.uid() !== id)
                          ────▶ Show: "Unauthorized"
```

---

## 6. Quick Reference: Service Functions

### auth.service.ts

```typescript
// SIGN-UP
signUpWithEmail({
  email: string,
  password: string,
  fullName: string,
  role: 'worker' | 'employer'
})
→ { data: { needsEmailConfirm, userId }, error }

signUpWithPhone({
  phone: string,  // +12025550100
  role: 'worker' | 'employer'
})
→ { data: null, error }

// VERIFICATION
verifyPhoneOtp(phone, token)
→ { data: null, error }

// SIGN-IN
signInWithEmail({ email, password })
→ { data: null, error }

signInWithPhone(phone)
→ { data: null, error }

// SESSION
getSession()
→ { session, error }

getCurrentUser()
→ { user, error }

// LOGOUT
signOut()
→ { data: null, error }

// PASSWORD
sendPasswordReset(email)
→ { data: null, error }
```

### profile.service.ts

```typescript
// READ
getMyProfile()
→ { data: UserProfile, error }

// UPSERT
upsertMyProfile(fields)
→ { data: null, error }

// MARK COMPLETE
markOnboardingComplete()
→ { data: null, error }
```

### hooks/use-auth-session.ts

```typescript
useAuthSession()
→ {
    session: Session | null,
    user: User | null,
    loading: boolean
  }
```

---

## 7. Environment Variables Required

```bash
# .env file (never commit!)

# Supabase client credentials (PUBLIC, safe)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# ❌ NEVER add these to client:
# SERVICE_ROLE_KEY
# SUPABASE_JWT_SECRET
# API keys for other services
```

---

## 8. Database Schema

### profiles table

```
id (UUID, PK) ──────▶ References auth.users.id
full_name (TEXT)
role (TEXT) ────────▶ 'worker' | 'employer'
avatar_url (TEXT)
onboarding_complete (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### RLS Policies

| Policy | Operation | Condition | Effect |
|--------|-----------|-----------|--------|
| `Users can read their own profile` | SELECT | `auth.uid() = id` | User sees only their row |
| `Users can update their own profile` | UPDATE | `auth.uid() = id` | User updates only their row |

### Trigger

| Trigger | Fires On | Action |
|---------|----------|--------|
| `on_auth_user_created` | auth.users INSERT | Insert row into public.profiles |

---

## 9. Status Indicators & Loading States

```
Sign-Up Button States:

[ DISABLED ]  ← Form validation failing
                  (missing fields, weak password, etc.)

[ LOADING ]  ← async request in flight
              (show spinner, disable inputs)

[ ENABLED ]  ← Ready to submit
```

Error Display:

```
┌─────────────────────────────────┐
│ ✗ Email already registered      │  ← Red background
└─────────────────────────────────┘     Shows for 5-10 seconds
                                       OR until user retries
```

Confirmation Screens:

```
confirm-email.tsx:
  "Check your email for confirmation link"
  [Resend] button to re-send if needed

confirm-phone.tsx:
  "We'll send you a code to [phone number]"
  [Send me the code] button

otp.tsx:
  "Enter the 6-digit code"
  [Input field] for OTP
  [Verify] button
```

---

## 10. Security Checklist (Before Production)

- [ ] `EXPO_PUBLIC_SUPABASE_URL` set
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `.env` in `.gitignore`
- [ ] No SERVICE_ROLE_KEY in client code
- [ ] RLS enabled on `profiles` table
- [ ] RLS policies created (SELECT + UPDATE)
- [ ] Email confirmation configured (if required)
- [ ] Phone SMS provider configured (if using)
- [ ] Deep-link registered in `app.json`
- [ ] Database trigger verified working
- [ ] Profile fallback implemented
- [ ] Error messages user-friendly
- [ ] Session persistence tested
- [ ] Sign-out clears session completely

---

