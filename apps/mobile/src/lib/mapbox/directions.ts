import { getMapboxAccessToken } from '@/lib/mapbox/access-token';

export type DirectionsProfile = 'driving' | 'walking' | 'cycling';

export type LineStringGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type DirectionsResult = {
  durationSec: number;
  distanceM: number;
  geometry: LineStringGeometry;
};

type MbDirectionsResponse = {
  routes?: {
    duration: number;
    distance: number;
    geometry: { type: string; coordinates: [number, number][] };
  }[];
};

export async function fetchDirections(
  origin: { lng: number; lat: number },
  dest: { lng: number; lat: number },
  profile: DirectionsProfile,
): Promise<DirectionsResult | null> {
  const token = getMapboxAccessToken();
  const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?geometries=geojson&overview=full&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as MbDirectionsResponse;
  const r = data.routes?.[0];
  if (!r?.geometry?.coordinates?.length) return null;
  return {
    durationSec: r.duration,
    distanceM: r.distance,
    geometry: { type: 'LineString', coordinates: r.geometry.coordinates },
  };
}

export function formatDriveDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${m} mins`;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h} hrs ${m} mins`;
}

export function formatMiles(meters: number): string {
  const mi = meters * 0.000621371;
  return `${mi.toFixed(1)} mi.`;
}
