/**
 * auth.service.ts
 *
 * All Supabase Auth operations for the Huzly app.
 * Import `supabase` ONLY from '@/lib/config/supabase'.
 * Never instantiate a second client elsewhere.
 */

import { supabase } from '@/lib/config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

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
    phone: string; // E.164 format, e.g. "+12025550100"
    role: AuthRole;
}

export interface AuthServiceResult<T = void> {
    data: T | null;
    error: string | null;
}

// ─── Sign-Up ──────────────────────────────────────────────────────────────────

/**
 * Sign up with email + password.
 *
 * After Supabase creates the auth user the server-side DB trigger
 * (handle_new_user) automatically inserts a row into public.profiles.
 *
 * Returns:
 *   - data.session → null when email confirmation is required
 *   - data.user    → always present on success
 */
export async function signUpWithEmail(
    payload: SignUpEmailPayload
): Promise<AuthServiceResult<{ needsEmailConfirm: boolean }>> {
    const { email, password, fullName, role } = payload;

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
        return { data: null, error: error.message };
    }

    // session is null when email confirmation is enabled in Supabase dashboard
    const needsEmailConfirm = data.session === null;

    return { data: { needsEmailConfirm }, error: null };
}

/**
 * Sign up with phone number (OTP flow).
 * Sends an SMS OTP — call verifyPhoneOtp() after the user enters the code.
 */
export async function signUpWithPhone(
    payload: SignUpPhonePayload
): Promise<AuthServiceResult> {
    const { phone, role } = payload;

    const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
            data: { role },
            // channel: 'sms'  ← default; or 'whatsapp'
        },
    });

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

// ─── OTP Verification ─────────────────────────────────────────────────────────

/**
 * Verify phone OTP sent by signUpWithPhone / signInWithPhone.
 */
export async function verifyPhoneOtp(
    phone: string,
    token: string
): Promise<AuthServiceResult> {
    const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
    });

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

// ─── Sign-In ──────────────────────────────────────────────────────────────────

/**
 * Sign in with email + password.
 */
export async function signInWithEmail(
    payload: SignInEmailPayload
): Promise<AuthServiceResult> {
    const { email, password } = payload;

    const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
    });

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

/**
 * Send phone OTP for sign-in.
 */
export async function signInWithPhone(phone: string): Promise<AuthServiceResult> {
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

// ─── Sign-Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<AuthServiceResult> {
    const { error } = await supabase.auth.signOut();

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * Send a password-reset email.
 * redirectTo should be a deep-link registered in app.json / Supabase dashboard.
 */
export async function sendPasswordReset(email: string): Promise<AuthServiceResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'huzly://reset-password' }
    );

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

// ─── Current Session / User ───────────────────────────────────────────────────

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
}

export async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
}
