export const STORAGE_KEYS = {
  supabaseSession: 'supabase:session',
  onboardingState: 'onboarding:state',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

