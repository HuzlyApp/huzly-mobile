/**
 * auth-enhanced.service.ts
 *
 * ENHANCED version of auth.service.ts with:
 *   - Profile creation fallback
 *   - User-friendly error messages
 *   - Improved type safety
 *   - Better logging
 *
 * This is a reference implementation showing best practices.
 * Merge these enhancements into your existing auth.service.ts
 */

import { supabase } from '@/lib/config/supabase';

// ─── Error Message Mapping ────────────────────────────────────────────────

export const AUTH_ERROR_MESSAGES = {
  // Email/Password errors
  USER_ALREADY_EXISTS: 'This email is already registered. Try signing in instead.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password must be at least 8 characters.',
  
  // OTP errors
  OTP_EXPIRED: 'Your OTP has expired. Request a new code.',
  INVALID_OTP: 'Invalid or expired OTP. Please try again.',
  
  // Network/Generic
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An error occurred. Please try again.',
} as const;

/**
 * Convert Supabase error messages to user-friendly text
 */
function formatAuthError(error: string): string {
  if (error.includes('already registered')) {
    return AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS;
  }
  if (error.includes('invalid_body') || error.includes('Invalid email')) {
    return AUTH_ERROR_MESSAGES.INVALID_EMAIL;
  }
  if (error.includes('weak password') || error.includes('password should')) {
    return AUTH_ERROR_MESSAGES.WEAK_PASSWORD;
  }
  if (error.includes('expired')) {
    return AUTH_ERROR_MESSAGES.OTP_EXPIRED;
  }
  if (error.includes('invalid otp')) {
    return AUTH_ERROR_MESSAGES.INVALID_OTP;
  }
  // Return original if no match (fallback)
  return error;
}

// ─── Types ────────────────────────────────────────────────────────────────

export type AuthRole = 'worker' | 'employer';

export interface SignUpEmailPayload {
  email: string;
  password: string;
  fullName: string;
  role: AuthRole;
}

export interface SignInEmailPayload {
  email: string;
  password: string;
}

export interface SignUpPhonePayload {
  phone: string; // E.164 format: "+12025550100"
  role: AuthRole;
}

export interface AuthServiceResult<T = void> {
  data: T | null;
  error: string | null;
}

// ─── Sign-Up with Email ───────────────────────────────────────────────────

/**
 * ENHANCED: Sign up with email + password.
 *
 * After Supabase creates the auth user, the trigger `handle_new_user`
 * automatically inserts a row into public.profiles.
 *
 * As a fallback, we also attempt to upsert the profile here.
 * This ensures profile exists even if the trigger hasn't fired yet.
 *
 * Returns:
 *   - data.needsEmailConfirm: true if email confirmation required
 *   - data.userId: the created user's ID
 *   - error: user-friendly error message
 */
export async function signUpWithEmail(
  payload: SignUpEmailPayload
): Promise<AuthServiceResult<{ needsEmailConfirm: boolean; userId?: string }>> {
  const { email, password, fullName, role } = payload;

  // Input validation
  if (!email?.trim() || !password?.trim() || !fullName?.trim()) {
    return { data: null, error: 'All fields are required.' };
  }

  if (password.length < 8) {
    return { data: null, error: AUTH_ERROR_MESSAGES.WEAK_PASSWORD };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        role,
      },
    },
  });

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  const userId = data.user?.id;
  const needsEmailConfirm = data.session === null;

  // ⭐ Fallback: Ensure profile was created (in case trigger didn't fire)
  if (userId) {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            full_name: fullName.trim(),
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      // Don't fail signup if profile upsert fails — log and continue
      if (profileError && !profileError.message.includes('duplicate')) {
        console.warn('[auth] Profile creation fallback warning:', profileError.message);
      }
    } catch (err) {
      console.warn('[auth] Profile creation fallback error:', err);
      // Continue anyway — trigger might have worked
    }
  }

  return { data: { needsEmailConfirm, userId }, error: null };
}

// ─── Sign-Up with Phone (OTP) ─────────────────────────────────────────────

/**
 * Sign up with phone number (OTP flow).
 * Sends an SMS OTP to the user. They then call verifyPhoneOtp()
 * with the code they receive.
 *
 * @param payload.phone - E.164 format, e.g. "+12025550100"
 */
export async function signUpWithPhone(
  payload: SignUpPhonePayload
): Promise<AuthServiceResult> {
  const { phone, role } = payload;

  if (!phone?.trim()) {
    return { data: null, error: 'Phone number is required.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      data: { role },
      // channel: 'sms' (default) or 'whatsapp'
    },
  });

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: null, error: null };
}

// ─── OTP Verification ─────────────────────────────────────────────────────

/**
 * Verify phone OTP sent by signUpWithPhone / signInWithPhone.
 *
 * This completes the phone authentication flow and creates a session.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<AuthServiceResult> {
  if (!phone?.trim() || !token?.trim()) {
    return { data: null, error: 'Phone and OTP code are required.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: null, error: null };
}

// ─── Sign-In with Email ───────────────────────────────────────────────────

export async function signInWithEmail(
  payload: SignInEmailPayload
): Promise<AuthServiceResult> {
  const { email, password } = payload;

  if (!email?.trim() || !password?.trim()) {
    return { data: null, error: 'Email and password are required.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: null, error: null };
}

// ─── Sign-In with Phone ───────────────────────────────────────────────────

export async function signInWithPhone(phone: string): Promise<AuthServiceResult> {
  if (!phone?.trim()) {
    return { data: null, error: 'Phone number is required.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: phone.trim(),
  });

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: null, error: null };
}

// ─── Sign-Out ─────────────────────────────────────────────────────────────

export async function signOut(): Promise<AuthServiceResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: null, error: null };
}

// ─── Password Reset ───────────────────────────────────────────────────────

/**
 * Send a password-reset email.
 * The user clicks a link in their email to reset their password.
 *
 * The redirectTo URL should be a deep-link registered in:
 *   1. app.json (expo deep linking)
 *   2. Supabase dashboard (Auth → Email Templates → redirect_to)
 */
export async function sendPasswordReset(email: string): Promise<AuthServiceResult> {
  if (!email?.trim()) {
    return { data: null, error: 'Email is required.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: 'huzly://reset-password', // Deep link
    }
  );

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: null, error: null };
}

// ─── Session & User Info ──────────────────────────────────────────────────

/**
 * Get the current session (if any).
 * Used during app startup to restore session from AsyncStorage.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/**
 * Get the currently authenticated user.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

/**
 * Refresh the auth token.
 * Useful before making API calls if you suspect token expired.
 */
export async function refreshSession(): Promise<AuthServiceResult> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    return { data: null, error: formatAuthError(error.message) };
  }

  return { data: { session: data.session }, error: null };
}
