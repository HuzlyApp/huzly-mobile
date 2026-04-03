import { getMapboxAccessToken } from '@/lib/mapbox/access-token';

export type GeocodeResult = { lng: number; lat: number; placeName: string };

export async function geocodeForward(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  const token = getMapboxAccessToken();
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { center?: [number, number]; place_name?: string }[];
  };
  const f = data.features?.[0];
  if (!f?.center) return null;
  return { lng: f.center[0], lat: f.center[1], placeName: f.place_name ?? q };
}
