import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import MapboxWebMap from '@/components/mapbox/MapboxWebMap';
import BottomNav from '@/components/ui/BottomNav';
import { getMapboxAccessToken } from '@/lib/mapbox/access-token';
import {
  fetchDirections,
  formatDriveDuration,
  formatMiles,
  type DirectionsProfile,
  type LineStringGeometry,
} from '@/lib/mapbox/directions';
import { geocodeForward } from '@/lib/mapbox/geocode';
import { getHomeAddressText, setHomeAddressText } from '@/lib/mapbox/home-address';

const PRIMARY = '#2563EB';
const HEADER_BLUE = '#1E3A5F';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const PAGE_BG = '#F8FAFC';
const CARD_BORDER = '#93C5FD';

type OriginMode = 'home' | 'current';

const PROFILES: { key: DirectionsProfile; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'driving', icon: 'car', label: 'Car' },
  { key: 'cycling', icon: 'subway-outline', label: 'Train' },
  { key: 'walking', icon: 'walk', label: 'Walking' },
];

/** Expo Router may pass `string[]` on web for query keys; normalize so coords parse correctly. */
function pickRouteParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : undefined;
}

export default function DirectionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    destLat?: string | string[];
    destLng?: string | string[];
    address?: string | string[];
    label?: string | string[];
  }>();

  const destLatRaw = pickRouteParam(params.destLat);
  const destLngRaw = pickRouteParam(params.destLng);
  const destLabel = pickRouteParam(params.label)?.trim() || 'Destination';
  const destAddress = pickRouteParam(params.address)?.trim() || '';

  const [token, setToken] = useState<string | null>(null);
  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);
  const [originMode, setOriginMode] = useState<OriginMode>('home');
  const [homeText, setHomeText] = useState('');
  const [editingHome, setEditingHome] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [profile, setProfile] = useState<DirectionsProfile>('driving');
  const [route, setRoute] = useState<LineStringGeometry | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    try {
      setToken(getMapboxAccessToken());
    } catch {
      setToken(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const h = await getHomeAddressText();
      setHomeText(h);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const lat = destLatRaw ? Number(destLatRaw) : NaN;
      const lng = destLngRaw ? Number(destLngRaw) : NaN;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (!cancelled) setDest({ lat, lng });
        return;
      }
      if (destAddress) {
        const g = await geocodeForward(destAddress);
        if (!cancelled && g) setDest({ lat: g.lat, lng: g.lng });
      } else if (!cancelled) setDest(null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [destLatRaw, destLngRaw, destAddress]);

  useEffect(() => {
    if (!dest) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      if (originMode === 'current') {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (!cancelled) {
            setOrigin(null);
            setLoading(false);
          }
          Alert.alert('Location', 'Allow location to route from where you are now.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLoading(false);
        }
        return;
      }
      const line = homeText.trim() || (await getHomeAddressText());
      const g = await geocodeForward(line);
      if (!cancelled) {
        setOrigin(g ? { lat: g.lat, lng: g.lng } : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dest, originMode, homeText]);

  useEffect(() => {
    if (!dest || !origin || !token) {
      setRoute(null);
      setDurationSec(null);
      setDistanceM(null);
      return;
    }
    let cancelled = false;
    setRouting(true);
    void (async () => {
      const r = await fetchDirections(origin, dest, profile);
      if (cancelled) return;
      if (r) {
        setRoute(r.geometry);
        setDurationSec(r.durationSec);
        setDistanceM(r.distanceM);
      } else {
        setRoute(null);
        setDurationSec(null);
        setDistanceM(null);
      }
      setRouting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dest, origin, profile, token]);

  const mapCenter = useMemo(() => {
    if (dest) return { lng: dest.lng, lat: dest.lat };
    return { lng: -98.5795, lat: 39.8283 };
  }, [dest]);

  const saveHome = useCallback(async () => {
    await setHomeAddressText(homeText);
    setEditingHome(false);
    if (originMode === 'home') {
      const g = await geocodeForward(homeText);
      if (g) setOrigin({ lat: g.lat, lng: g.lng });
    }
  }, [homeText, originMode]);

  const openNativeTurnByTurn = useCallback(async () => {
    if (!dest) {
      Alert.alert('Directions', 'Destination is not available yet.');
      return;
    }

    const destPair = `${dest.lat},${dest.lng}`;
    const destQuery = destAddress.trim() ? encodeURIComponent(destAddress.trim()) : encodeURIComponent(destPair);
    const hasOrigin = origin != null && Number.isFinite(origin.lat) && Number.isFinite(origin.lng);

    /**
     * Web: `Linking.openURL` uses `window.open`, which often returns `null` when popups are blocked.
     * RN Web still resolves the promise, so it looked like "nothing happened" and nothing showed in Network.
     * Fall back to same-tab navigation so the click always does something.
     */
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = hasOrigin
        ? `https://www.google.com/maps/dir/?api=1&origin=${origin!.lat},${origin!.lng}&destination=${dest.lat},${dest.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
      const pop = window.open(url, '_blank', 'noopener,noreferrer');
      if (pop == null) {
        window.location.assign(url);
      }
      return;
    }

    const candidates: string[] = [];

    if (Platform.OS === 'ios') {
      // https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
      if (hasOrigin) {
        candidates.push(
          `https://maps.apple.com/?saddr=${origin!.lat},${origin!.lng}&daddr=${dest.lat},${dest.lng}`,
        );
        candidates.push(
          `http://maps.apple.com/?saddr=${origin!.lat},${origin!.lng}&daddr=${dest.lat},${dest.lng}`,
        );
      }
      candidates.push(`https://maps.apple.com/?daddr=${destQuery}`);
      candidates.push(`http://maps.apple.com/?daddr=${destQuery}`);
      candidates.push(`maps://maps.apple.com/?daddr=${dest.lat},${dest.lng}`);
    } else if (Platform.OS === 'android') {
      if (hasOrigin) {
        candidates.push(
          `https://www.google.com/maps/dir/?api=1&origin=${origin!.lat},${origin!.lng}&destination=${dest.lat},${dest.lng}`,
        );
      }
      candidates.push(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`);
      candidates.push(`google.navigation:q=${dest.lat},${dest.lng}`);
      candidates.push(`geo:${dest.lat},${dest.lng}?q=${dest.lat},${dest.lng}`);
    } else {
      candidates.push(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`);
    }

    for (const url of candidates) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        /* try next */
      }
    }

    Alert.alert(
      'Open maps',
      'Could not open Apple Maps or Google Maps from this device. Try again on a phone, or copy the address from the job screen.',
    );
  }, [dest, destAddress, origin]);

  if (!token) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>Directions</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.centerMsg}>
          <Text style={styles.errText}>Mapbox token missing. Set MAPBOX_API_KEY in .env and restart Expo.</Text>
        </View>
        <BottomNav active="explore" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>Directions</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
      >
        <View style={styles.destCard}>
          <Text style={styles.destTitle}>Directions to {destLabel}</Text>
          {destAddress ? <Text style={styles.destAddr}>{destAddress}</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>Directions from</Text>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segBtn, originMode === 'home' && styles.segBtnOn]}
            onPress={() => setOriginMode('home')}
          >
            <Ionicons name="home" size={18} color={originMode === 'home' ? PRIMARY : TEXT_SECONDARY} />
            <Text style={[styles.segText, originMode === 'home' && styles.segTextOn]}>Home</Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, originMode === 'current' && styles.segBtnOn]}
            onPress={() => setOriginMode('current')}
          >
            <Ionicons name="navigate" size={18} color={originMode === 'current' ? PRIMARY : TEXT_SECONDARY} />
            <Text style={[styles.segText, originMode === 'current' && styles.segTextOn]}>My Location</Text>
          </Pressable>
        </View>

        {originMode === 'home' ? (
          <View style={styles.homeRow}>
            <TextInput
              style={styles.homeInput}
              value={homeText}
              onChangeText={setHomeText}
              editable={editingHome}
              placeholder="Home address"
              placeholderTextColor="#94A3B8"
            />
            <Pressable
              onPress={() => {
                if (editingHome) void saveHome();
                else setEditingHome(true);
              }}
              style={styles.editBtn}
            >
              <Ionicons name={editingHome ? 'checkmark' : 'pencil'} size={20} color={PRIMARY} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>Using your current GPS location as the start point.</Text>
        )}

        <View style={styles.mapBox}>
          {loading || !dest ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.mapLoadingText}>
                {!dest ? 'Could not resolve job location. Add lat/lng or address in Supabase.' : 'Finding start…'}
              </Text>
            </View>
          ) : (
            <MapboxWebMap
              accessToken={token}
              center={mapCenter}
              zoom={10}
              route={route}
              markers={[
                { id: 'dest', lng: dest.lng, lat: dest.lat, selected: true },
                ...(origin ? [{ id: 'origin', lng: origin.lng, lat: origin.lat }] : []),
              ]}
              fit={route ? 'route' : 'markers'}
              mapKey={`${origin?.lat}-${dest.lat}-${profile}-${route?.coordinates?.length ?? 0}`}
            />
          )}
        </View>

        <View style={styles.modeRow}>
          {PROFILES.map((p) => {
            const on = profile === p.key;
            return (
              <Pressable
                key={p.key}
                style={[styles.modeBtn, on && styles.modeBtnOn]}
                onPress={() => setProfile(p.key)}
              >
                <Ionicons name={p.icon} size={22} color={on ? '#FFF' : TEXT_SECONDARY} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Driving time</Text>
            <Text style={styles.statValue}>
              {routing ? '…' : durationSec != null ? formatDriveDuration(durationSec) : '—'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Mileage</Text>
            <View style={styles.statInline}>
              <Ionicons name="cloud-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={styles.statValue}>
                {routing ? '…' : distanceM != null ? formatMiles(distanceM) : '—'}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.cta, !dest && styles.ctaDisabled]}
          onPress={() => void openNativeTurnByTurn()}
          accessibilityRole="button"
          accessibilityLabel="Open turn-by-turn directions in Maps"
        >
          <Ionicons name="navigate-outline" size={20} color={dest ? PRIMARY : '#94A3B8'} />
          <Text style={[styles.ctaText, !dest && styles.ctaTextDisabled]}>Get driving Direction</Text>
        </Pressable>
      </ScrollView>

      <BottomNav active="explore" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: HEADER_BLUE },
  scrollView: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  destCard: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  destTitle: { fontSize: 16, fontWeight: '800', color: HEADER_BLUE },
  destAddr: { marginTop: 6, fontSize: 14, color: TEXT_SECONDARY, lineHeight: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 8 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segBtnOn: { backgroundColor: '#FFF' },
  segText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  segTextOn: { color: PRIMARY },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#FFF',
    marginBottom: 12,
    paddingRight: 8,
  },
  homeInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: TEXT_PRIMARY },
  editBtn: { padding: 8 },
  hint: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 12 },
  mapBox: { height: 220, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9' },
  mapLoadingText: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', paddingHorizontal: 20 },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, marginBottom: 16 },
  modeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  statInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#FFF',
  },
  ctaDisabled: { opacity: 0.55, borderColor: BORDER },
  ctaText: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  ctaTextDisabled: { color: '#94A3B8' },
  centerMsg: { flex: 1, justifyContent: 'center', padding: 24 },
  errText: { textAlign: 'center', color: '#B91C1C', fontSize: 15, lineHeight: 22 },
});
