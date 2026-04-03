import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
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
import { geocodeForward } from '@/lib/mapbox/geocode';
import { jobCategoryNameFromShift } from '@/lib/shifts/explore-filters';
import {
  estimateShiftPay,
  fetchShiftsPage,
  isMultiShift,
  toNum,
  type ShiftBrowseItem,
} from '@/lib/shifts/shifts-browse.service';

const HEADER_BLUE = '#1E3A5F';
const PRIMARY = '#2563EB';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const PAGE_BG = '#F8FAFC';

const CHARLOTTE = { lat: 35.2271, lng: -80.8431 };
const RADIUS_KM = 120;

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function formatCardDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

export default function ExploreMapScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<ShiftBrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState(CHARLOTTE);
  const [search, setSearch] = useState('Charlotte NC, USA');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      setToken(getMapboxAccessToken());
    } catch {
      setToken(null);
    }
  }, []);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    const acc: ShiftBrowseItem[] = [];
    let from = 0;
    let more = true;
    try {
      while (more && acc.length < 120) {
        const { data, error, hasMore } = await fetchShiftsPage(from);
        if (error || !data?.length) break;
        acc.push(...data);
        from += data.length;
        more = hasMore;
      }
      setItems(acc);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    void (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (pos) {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    })();
  }, []);

  const onSearchSubmit = useCallback(async () => {
    const g = await geocodeForward(search);
    if (g) setCenter({ lat: g.lat, lng: g.lng });
    else Alert.alert('Search', 'Could not find that location.');
  }, [search]);

  const nearby = useMemo(() => {
    return items.filter((s) => {
      const lat = toNum(s.facility?.lat);
      const lng = toNum(s.facility?.lng);
      if (lat == null || lng == null) return false;
      return kmBetween(center, { lat, lng }) <= RADIUS_KM;
    });
  }, [items, center]);

  const markers = useMemo(
    () =>
      nearby
        .map((s) => {
          const lat = toNum(s.facility?.lat);
          const lng = toNum(s.facility?.lng);
          if (lat == null || lng == null) return null;
          return { id: s.id, lng, lat, selected: s.id === selectedId };
        })
        .filter((m): m is { id: string; lng: number; lat: number; selected: boolean } => m != null),
    [nearby, selectedId],
  );

  const selectedShift = selectedId ? nearby.find((s) => s.id === selectedId) ?? null : null;

  const mapKey = `${center.lat}-${center.lng}-${markers.length}-${selectedId ?? ''}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
        </Pressable>
        <Ionicons name="search-outline" size={20} color={TEXT_SECONDARY} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="City or address"
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
          onSubmitEditing={() => void onSearchSubmit()}
        />
        <Pressable
          hitSlop={8}
          onPress={() => router.push('/(tabs)/explore')}
          accessibilityLabel="List view and filters"
        >
          <Ionicons name="options-outline" size={22} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        {!token ? (
          <View style={styles.mapFallback}>
            <Text style={styles.fallbackText}>Add MAPBOX_API_KEY to .env and restart Expo.</Text>
          </View>
        ) : loading ? (
          <View style={styles.mapFallback}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <MapboxWebMap
            accessToken={token}
            center={{ lng: center.lng, lat: center.lat }}
            zoom={9}
            markers={markers}
            fit={markers.length > 0 ? 'markers' : 'center'}
            mapKey={mapKey}
            onMarkerPress={(id) => {
              setSelectedId(id);
              setSheetOpen(false);
            }}
          />
        )}

        {nearby.length === 0 && !loading && token ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={36} color="#EF4444" />
            <Text style={styles.emptyTitle}>No jobs available</Text>
            <Text style={styles.emptySub}>Try moving the map or entering a different location</Text>
          </View>
        ) : null}

        {selectedShift ? (
          <View style={styles.floatingCard}>
            <MapJobCard
              shift={selectedShift}
              onBook={() => Alert.alert('Book shift', 'Booking will be available soon.')}
              onMessage={() => router.push('/messaging')}
              onDetails={() => router.push(`/shift/${selectedShift.id}`)}
              onClose={() => setSelectedId(null)}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.sheet, sheetOpen && styles.sheetOpen]}>
        <Pressable style={styles.sheetGrab} onPress={() => setSheetOpen((o) => !o)}>
          <View style={styles.grabBarWrap}>
            <View style={styles.grabBar} />
          </View>
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>
              {nearby.length} Job{nearby.length === 1 ? '' : 's'} available in this location
            </Text>
            <Ionicons name={sheetOpen ? 'chevron-down' : 'chevron-up'} size={20} color={TEXT_SECONDARY} />
          </View>
        </Pressable>
        {sheetOpen ? (
          <FlatList
            data={nearby}
            keyExtractor={(s) => s.id}
            style={styles.sheetList}
            contentContainerStyle={styles.sheetListContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedId(item.id);
                  const lat = toNum(item.facility?.lat);
                  const lng = toNum(item.facility?.lng);
                  if (lat != null && lng != null) setCenter({ lat, lng });
                }}
              >
                <MapListRow shift={item} />
              </Pressable>
            )}
          />
        ) : null}
      </View>

      <BottomNav active="explore" />
    </SafeAreaView>
  );
}

function MapListRow({ shift }: { shift: ShiftBrowseItem }) {
  const company = shift.facility?.name?.trim() || 'Employer';
  const categoryName = jobCategoryNameFromShift(shift) || 'General';
  const rate = toNum(shift.rate_per_hour);
  const people = toNum(shift.number_of_people_needed);
  const est = estimateShiftPay(shift);
  const multi = isMultiShift(shift);
  return (
    <View style={styles.listRow}>
      <View style={styles.listIcon}>
        <Ionicons name="person" size={20} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {shift.title?.trim() || 'Shift'}
        </Text>
        <Text style={styles.listCompany} numberOfLines={1}>
          {company}
        </Text>
        <Text style={styles.listMeta}>
          {formatCardDate(shift.start_date)} · {people != null && people > 0 ? `${people} People Needed` : 'Open'}
        </Text>
        <View style={styles.listPay}>
          <Text style={styles.listRate}>{rate != null ? `${money(rate)} / hr` : '—'}</Text>
          {est != null ? <Text style={styles.listEst}>Est. {money(est)}</Text> : null}
        </View>
      </View>
      {multi ? (
        <View style={styles.multiPill}>
          <Ionicons name="sync" size={10} color={PRIMARY} />
          <Text style={styles.multiPillText}>Multi</Text>
        </View>
      ) : null}
    </View>
  );
}

function MapJobCard({
  shift,
  onBook,
  onMessage,
  onDetails,
  onClose,
}: {
  shift: ShiftBrowseItem;
  onBook: () => void;
  onMessage: () => void;
  onDetails: () => void;
  onClose: () => void;
}) {
  const categoryName = jobCategoryNameFromShift(shift) || 'Warehouse & Logistics';
  const rate = toNum(shift.rate_per_hour);
  const people = toNum(shift.number_of_people_needed);
  const est = estimateShiftPay(shift);
  const multi = isMultiShift(shift);
  return (
    <View style={styles.jobCard}>
      <Pressable style={styles.jobClose} onPress={onClose} hitSlop={10}>
        <Ionicons name="close-circle" size={22} color={TEXT_SECONDARY} />
      </Pressable>
      <View style={styles.jobTop}>
        <View style={styles.jobIcon}>
          <Ionicons name="person" size={22} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle}>{shift.title?.trim() || 'Shift'}</Text>
          <Text style={styles.jobCat}>{categoryName}</Text>
        </View>
        {multi ? (
          <View style={styles.multiPill}>
            <Ionicons name="sync" size={10} color={PRIMARY} />
            <Text style={styles.multiPillText}>Multi</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.jobMeta}>
        <Ionicons name="calendar-outline" size={16} color={TEXT_SECONDARY} />
        <Text style={styles.jobMetaText}>{formatCardDate(shift.start_date)}</Text>
      </View>
      <View style={styles.jobMeta}>
        <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
        <Text style={styles.jobMetaText}>3:00 PM EST</Text>
      </View>
      <View style={styles.jobMeta}>
        <Ionicons name="people-outline" size={16} color={TEXT_SECONDARY} />
        <Text style={styles.jobMetaText}>
          {people != null && people > 0 ? `${people} People Needed` : 'Open roles'}
        </Text>
      </View>
      <View style={styles.jobPayRow}>
        <Text style={styles.jobRate}>{rate != null ? `${money(rate)} / hr` : '—'}</Text>
        {est != null ? <Text style={styles.jobEst}>Est. {money(est)}</Text> : null}
      </View>
      <View style={styles.jobBtns}>
        <Pressable style={styles.bookBtn} onPress={onBook}>
          <Text style={styles.bookBtnText}>Book this shift</Text>
        </Pressable>
        <Pressable style={styles.msgBtn} onPress={onMessage}>
          <Text style={styles.msgBtnText}>Message</Text>
        </Pressable>
      </View>
      <Pressable onPress={onDetails} style={styles.detailsLink}>
        <Text style={styles.detailsLinkText}>Full details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: BORDER,
    zIndex: 20,
  },
  back: { marginRight: 4 },
  searchInput: { flex: 1, fontSize: 15, color: TEXT_PRIMARY, paddingVertical: 0 },
  mapWrap: { flex: 1, position: 'relative' },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    padding: 24,
  },
  fallbackText: { textAlign: 'center', color: TEXT_SECONDARY, fontSize: 14 },
  emptyCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '32%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyTitle: { marginTop: 10, fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  emptySub: { marginTop: 6, fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center' },
  floatingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 120,
  },
  jobCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: PRIMARY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobClose: { position: 'absolute', top: 8, right: 8, zIndex: 2 },
  jobTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingRight: 28 },
  jobIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: HEADER_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY },
  jobCat: { marginTop: 4, fontSize: 14, color: TEXT_SECONDARY },
  multiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
  },
  multiPillText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  jobMetaText: { fontSize: 14, color: TEXT_PRIMARY },
  jobPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 12,
  },
  jobRate: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  jobEst: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },
  jobBtns: { flexDirection: 'row', gap: 10 },
  bookBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  msgBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  msgBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  detailsLink: { marginTop: 12, alignItems: 'center' },
  detailsLinkText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: BORDER,
    maxHeight: 130,
  },
  sheetOpen: { maxHeight: '52%' },
  sheetGrab: {
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  grabBarWrap: { alignItems: 'center', marginBottom: 8 },
  grabBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetTitle: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center', flex: 1 },
  sheetList: { maxHeight: 320 },
  sheetListContent: { paddingHorizontal: 12, paddingBottom: 16 },
  listRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: HEADER_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  listCompany: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  listMeta: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
  listPay: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  listRate: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  listEst: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
});
