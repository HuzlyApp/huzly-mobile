import Constants from 'expo-constants';

function mapboxFromExtras(): string {
  const fromExpo = Constants.expoConfig?.extra as { mapboxAccessToken?: string } | undefined;
  const a = fromExpo?.mapboxAccessToken?.trim();
  if (a) return a;

  const legacy = Constants.manifest as { extra?: { mapboxAccessToken?: string } } | null;
  const b = legacy?.extra?.mapboxAccessToken?.trim();
  if (b) return b;

  return '';
}

export function getMapboxAccessToken(): string {
  const fromExtras = mapboxFromExtras();
  const t = (
    fromExtras ||
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_API_KEY ||
    ''
  ).trim();
  if (!t) {
    throw new Error(
      'Mapbox token missing. Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN or MAPBOX_API_KEY to apps/mobile/.env and restart Expo.',
    );
  }
  return t;
}
