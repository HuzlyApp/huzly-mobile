import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapboxWebMap from '@/components/mapbox/MapboxWebMap';
import BottomNav from '@/components/ui/BottomNav';
import { useAuthSession } from '@/hooks/use-auth-session';
import { getMapboxAccessToken } from '@/lib/mapbox/access-token';
import { jobCategoryNameFromShift } from '@/lib/shifts/explore-filters';
import {
  estimateShiftPay,
  fetchWorkerAssignedShifts,
  toNum,
  type ShiftBrowseItem,
} from '@/lib/shifts/shifts-browse.service';

const HEADER_BLUE = '#1E3A5F';
const PRIMARY = '#2563EB';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const INFO_BG = '#EFF6FF';
const GREEN_STATUS = '#16A34A';
const GREEN_STATUS_BG = '#DCFCE7';

const DEFAULT_SHIFT_HOURS = '8:00 AM - 4:00 PM EST';

const FALLBACK_CENTER = { lat: 35.2271, lng: -80.8431 };

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function formatCardDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

function shiftStatus(shift: ShiftBrowseItem): { label: string; activeStyle: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = shift.start_date ? new Date(`${shift.start_date}T12:00:00`) : null;
  const end = shift.end_date ? new Date(`${shift.end_date}T12:00:00`) : start;
  if (!start || Number.isNaN(start.getTime())) return { label: 'Assigned', activeStyle: false };
  if (end && !Number.isNaN(end.getTime()) && today > end) return { label: 'Completed', activeStyle: false };
  if (today < start) return { label: 'Upcoming', activeStyle: false };
  return { label: 'Active', activeStyle: true };
}

function categoryIcon(shift: ShiftBrowseItem): keyof typeof Ionicons.glyphMap {
  const n = jobCategoryNameFromShift(shift).toLowerCase();
  if (n.includes('health')) return 'medkit-outline';
  if (n.includes('event')) return 'sparkles-outline';
  if (n.includes('hospitality') || n.includes('hotel')) return 'bed-outline';
  if (n.includes('warehouse') || n.includes('logistics')) return 'cube-outline';
  return 'briefcase-outline';
}

export default function MyJobsScreen() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [items, setItems] = useState<ShiftBrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(FALLBACK_CENTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchWorkerAssignedShifts(user.id);
    if (err) {
      setError(err);
      setItems([]);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      setToken(getMapboxAccessToken());
    } catch {
      setToken(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (pos) {
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    })();
  }, []);

  const markers = useMemo(
    () =>
      items
        .map((s) => {
          const lat = toNum(s.facility?.lat);
          const lng = toNum(s.facility?.lng);
          if (lat == null || lng == null) return null;
          return { id: s.id, lng, lat, selected: s.id === selectedId };
        })
        .filter((m): m is { id: string; lng: number; lat: number; selected: boolean } => m != null),
    [items, selectedId],
  );

  const mapKey = `${mapCenter.lat}-${mapCenter.lng}-${markers.length}-${selectedId ?? ''}`;

  const selectedShift = selectedId ? items.find((s) => s.id === selectedId) ?? null : null;

  const toggleInfo = (id: string) => {
    setInfoOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding-steps'))}
          style={styles.headerSide}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={HEADER_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Pressable onPress={() => router.push('/messaging')} hitSlop={8} accessibilityRole="button">
            <Ionicons name="notifications-outline" size={22} color={HEADER_BLUE} />
          </Pressable>
          <Pressable onPress={() => router.push('/messaging')} hitSlop={8} accessibilityRole="button">
            <Ionicons name="mail-outline" size={22} color={HEADER_BLUE} />
          </Pressable>
        </View>
      </View>

      <View style={styles.segmentWrap}>
        <Pressable
          onPress={() => setView('list')}
          style={[styles.segmentItem, view === 'list' && styles.segmentItemActive]}
        >
          <Text style={[styles.segmentLabel, view === 'list' && styles.segmentLabelActive]}>List</Text>
        </Pressable>
        <Pressable
          onPress={() => setView('map')}
          style={[styles.segmentItem, view === 'map' && styles.segmentItemActive]}
        >
          <Text style={[styles.segmentLabel, view === 'map' && styles.segmentLabelActive]}>Map</Text>
        </Pressable>
      </View>

      {view === 'list' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Assigned</Text>
            <Text style={styles.sectionCount}>{items.length}</Text>
          </View>

          {loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : error ? (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void load()}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={40} color={TEXT_SECONDARY} />
              <Text style={styles.emptyTitle}>No assigned jobs yet</Text>
              <Text style={styles.emptySub}>When you accept a shift and complete onboarding steps, it will show here.</Text>
              <Pressable style={styles.browseBtn} onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.browseBtnText}>Browse shifts</Text>
              </Pressable>
            </View>
          ) : (
            items.map((shift) => {
              const status = shiftStatus(shift);
              const est = estimateShiftPay(shift);
              const subtitle =
                shift.facility?.name?.trim() || jobCategoryNameFromShift(shift) || 'Work site TBD';
              const open = infoOpen[shift.id] ?? false;
              return (
                <View key={shift.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardIcon}>
                      <Ionicons name={categoryIcon(shift)} size={22} color={PRIMARY} />
                    </View>
                    <View style={styles.cardTitles}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {shift.title?.trim() || 'Shift'}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        status.activeStyle ? styles.statusPillActive : styles.statusPillMuted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          status.activeStyle ? styles.statusPillTextActive : styles.statusPillTextMuted,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={16} color={TEXT_SECONDARY} />
                      <Text style={styles.metaText}>{formatCardDate(shift.start_date)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
                      <Text style={styles.metaText}>{DEFAULT_SHIFT_HOURS}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Est. pay</Text>
                    <Text style={styles.payValue}>{est != null ? money(est) : '—'}</Text>
                  </View>

                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => router.push(`/shift/${shift.id}`)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryBtnText}>View shift</Text>
                  </Pressable>

                  <Pressable
                    style={styles.infoBanner}
                    onPress={() => toggleInfo(shift.id)}
                    accessibilityRole="button"
                  >
                    <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
                    <Text style={styles.infoBannerText} numberOfLines={open ? undefined : 1}>
                      Pre-shift checklist and site access — tap for reminders
                    </Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_SECONDARY} />
                  </Pressable>
                  {open ? (
                    <View style={styles.infoBody}>
                      <Text style={styles.infoBodyText}>
                        Arrive 15 minutes early with required credentials. Message your employer from the shift
                        screen if you need help.
                      </Text>
                      <View style={styles.infoActions}>
                        <Pressable
                          style={styles.infoGhost}
                          onPress={() => router.push(`/shift/${shift.id}?tab=requirements`)}
                        >
                          <Text style={styles.infoGhostText}>Requirements</Text>
                        </Pressable>
                        <Pressable style={styles.infoGhost} onPress={() => router.push('/messaging')}>
                          <Text style={styles.infoGhostText}>Message</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapArea}>
          {!token ? (
            <View style={styles.mapFallback}>
              <Text style={styles.fallbackText}>Add a Mapbox token in .env and restart Expo.</Text>
            </View>
          ) : loading ? (
            <View style={styles.mapFallback}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : (
            <MapboxWebMap
              accessToken={token}
              center={{ lng: mapCenter.lng, lat: mapCenter.lat }}
              zoom={10}
              markers={markers}
              fit={markers.length > 0 ? 'markers' : 'center'}
              mapKey={mapKey}
              onMarkerPress={(id) => setSelectedId(id)}
            />
          )}

          {!loading && items.length === 0 && token ? (
            <View style={styles.mapEmpty}>
              <Text style={styles.mapEmptyText}>No job locations to show</Text>
              <Pressable onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.mapEmptyLink}>Browse shifts</Text>
              </Pressable>
            </View>
          ) : null}

          {selectedShift && token ? (
            <View style={styles.mapCard}>
              <Pressable style={styles.mapCardClose} onPress={() => setSelectedId(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={22} color={TEXT_SECONDARY} />
              </Pressable>
              <Text style={styles.mapCardTitle} numberOfLines={1}>
                {selectedShift.title?.trim() || 'Shift'}
              </Text>
              <Text style={styles.mapCardSub} numberOfLines={2}>
                {selectedShift.facility?.address?.trim() ||
                  selectedShift.facility?.name?.trim() ||
                  'Location'}
              </Text>
              <Pressable style={styles.mapCardBtn} onPress={() => router.push(`/shift/${selectedShift.id}`)}>
                <Text style={styles.mapCardBtnText}>View shift</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      <BottomNav active="jobs" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerSide: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    justifyContent: 'flex-end',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HEADER_BLUE,
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: CARD_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  segmentLabelActive: {
    color: PRIMARY,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  sectionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  centerBlock: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitles: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPillActive: {
    backgroundColor: GREEN_STATUS_BG,
  },
  statusPillMuted: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: GREEN_STATUS,
  },
  statusPillTextMuted: {
    color: TEXT_SECONDARY,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  payValue: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: INFO_BG,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: HEADER_BLUE,
    fontWeight: '500',
  },
  infoBody: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  infoBodyText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  infoActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  infoGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: CARD_BG,
  },
  infoGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY,
  },
  mapArea: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    padding: 20,
  },
  fallbackText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  mapEmpty: {
    position: 'absolute',
    top: '30%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  mapEmptyText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  mapEmptyLink: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
  },
  mapCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  mapCardClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  mapCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    paddingRight: 28,
  },
  mapCardSub: {
    marginTop: 4,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  mapCardBtn: {
    marginTop: 12,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mapCardBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
