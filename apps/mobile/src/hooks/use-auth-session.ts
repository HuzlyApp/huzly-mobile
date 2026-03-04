/**
 * useAuthSession.ts
 *
 * Singleton auth-state hook — mount ONCE in RootLayout.
 *
 * Provides:
 *   - session   (null = unauthenticated)
 *   - user      (derived from session)
 *   - loading   (true until first auth event fires)
 *
 * Uses supabase.auth.onAuthStateChange, which is the canonical way to
 * track auth state in Supabase JS v2.
 */

import { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/config/supabase';

export interface AuthSessionState {
    session: Session | null;
    user: User | null;
    loading: boolean;
}

export function useAuthSession(): AuthSessionState {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get the persisted session from AsyncStorage on mount
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        // 2. Subscribe to auth state changes (sign-in, sign-out, token refresh)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return {
        session,
        user: session?.user ?? null,
        loading,
    };
}
