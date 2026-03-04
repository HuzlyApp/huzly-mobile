/**
 * env.ts — Centralized environment variable loader
 *
 * 🔐 Security contract:
 *   - Only EXPO_PUBLIC_* variables are readable in React Native.
 *   - EXPO_PUBLIC_* values ARE bundled into the app binary.
 *     Treat them as "semi-public" — never put secrets here.
 *   - SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET must NEVER be
 *     prefixed with EXPO_PUBLIC_. They belong only on the server.
 */

type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl?: string;
};

/**
 * Reads a required EXPO_PUBLIC_ environment variable.
 * Throws at module-load time if it is missing, so you catch
 * misconfiguration immediately on app startup — not deep in a user flow.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable: "${key}"\n` +
      `Make sure it is defined in your .env file with the EXPO_PUBLIC_ prefix.`
    );
  }
  return value.trim();
}

/**
 * Reads an optional EXPO_PUBLIC_ environment variable.
 * Returns undefined if not set.
 */
function optionalEnv(key: string): string | undefined {
  const value = process.env[key];
  return value?.trim() || undefined;
}

export const env: EnvConfig = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  apiBaseUrl: optionalEnv('EXPO_PUBLIC_API_BASE_URL'),
};
