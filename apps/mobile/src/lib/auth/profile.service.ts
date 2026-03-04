/**
 * profile.service.ts
 *
 * Reads and updates the current user's profile in public.profiles.
 *
 * The initial INSERT is handled automatically by the Postgres trigger
 * `handle_new_user` (see db/migrations/create_profiles_trigger.sql).
 * This service is used for reads and manual upserts when the trigger
 * is not sufficient (e.g., if you need to add extra fields later).
 */

import { supabase } from '@/lib/config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
    id: string;             // matches auth.users.id
    full_name: string | null;
    role: 'worker' | 'employer' | null;
    avatar_url: string | null;
    onboarding_complete: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProfileServiceResult<T = void> {
    data: T | null;
    error: string | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch the profile of the currently authenticated user.
 *
 * RLS policy: "Users can read their own profile"
 *   USING (auth.uid() = id)
 */
export async function getMyProfile(): Promise<ProfileServiceResult<UserProfile>> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: data as UserProfile, error: null };
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

/**
 * Upsert fields on the current user's profile.
 *
 * RLS policy: "Users can update their own profile"
 *   USING (auth.uid() = id)
 *
 * NOTE: The id field must come from auth.uid(). We derive it from the
 * current session so that no id needs to be passed from the UI layer.
 */
export async function upsertMyProfile(
    fields: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<ProfileServiceResult> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { data: null, error: userError?.message ?? 'Not authenticated' };
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() });

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: null, error: null };
}

// ─── Mark onboarding complete ─────────────────────────────────────────────────

export async function markOnboardingComplete(): Promise<ProfileServiceResult> {
    return upsertMyProfile({ onboarding_complete: true });
}
