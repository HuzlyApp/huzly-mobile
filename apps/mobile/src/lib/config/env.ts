type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl?: string;
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    console.warn(`Missing required environment variable: ${key}`);
    return '';
  }

  return value;
}

export const env: EnvConfig = {
  supabaseUrl: getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
};

