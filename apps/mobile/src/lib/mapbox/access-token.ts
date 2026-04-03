import Constants from 'expo-constants';

export function getMapboxAccessToken(): string {
  const extra = Constants.expoConfig?.extra as { mapboxAccessToken?: string } | undefined;
  const t = (extra?.mapboxAccessToken ?? process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '').trim();
  if (!t) {
    throw new Error(
      'Mapbox token missing. Add MAPBOX_API_KEY to apps/mobile/.env and restart Expo (app.config.js exposes it via extra).',
    );
  }
  return t;
}
