/**
 * supabase.ts
 *
 * Lazy-initialized Supabase client for React Native.
 * Created on-demand instead of at module load time to avoid
 * SSR issues when Expo bundles for web (window is not defined).
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/config/env';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client.
 * Lazy initialization avoids "window is not defined" errors during web bundling.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // Import AsyncStorage only when client is created (not at module load time)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    supabaseInstance = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseInstance;
}

/**
 * Export singleton instance getter for convenience.
 * Usage: import { supabase } from '@/lib/config/supabase'
 *        supabase.auth.getSession() → works fine
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    return (client as any)[prop];
  },
});

