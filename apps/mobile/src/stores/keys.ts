export const STORAGE_KEYS = {
  supabaseSession: 'supabase:session',
  onboardingState: 'onboarding:state',
  messageNotifSound: 'messages:notifications:sound',
  messageNotifVibration: 'messages:notifications:vibration',
  messageNotifBrowser: 'messages:notifications:browser',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

