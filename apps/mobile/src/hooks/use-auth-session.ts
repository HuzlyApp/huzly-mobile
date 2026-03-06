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
 * 
 * Handles app resumption by listening to AppState changes to restore
 * session when user returns from background.
 */

import { Session, User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/config/supabase';

export interface AuthSessionState {
    session: Session | null;
    user: User | null;
    loading: boolean;
}

export function useAuthSession(): AuthSessionState {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // 1. Get the persisted session from AsyncStorage on mount
        const initSession = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            setLoading(false);
        };

        initSession();

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

    // 3. Listen to app state changes (background/foreground)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    // Handle app state changes (when user switches apps or app goes to background/foreground)
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        // Only refresh session when app comes back to foreground
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            try {
                const { data } = await supabase.auth.getSession();
                setSession(data.session);
                setLoading(false);
            } catch (err) {
                console.error('Failed to restore session on app resume:', err);
            }
        }

        appState.current = nextAppState;
    };

    return {
        session,
        user: session?.user ?? null,
        loading,
    };
}
