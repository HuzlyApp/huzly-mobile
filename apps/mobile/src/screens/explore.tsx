import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ExploreFilterModal from '@/components/explore/ExploreFilterModal';
import BottomNav from '@/components/ui/BottomNav';
import {
  DEFAULT_EXPLORE_FILTERS,
  hasActiveExploreFilters,
  jobCategoryNameFromShift,
  shiftMatchesExploreFilters,
  type ExploreBrowseFilters,
} from '@/lib/shifts/explore-filters';
import {
  estimateShiftPay,
  fetchShiftsPage,
  isMultiShift,
  type ShiftBrowseItem,
  toNum,
} from '@/lib/shifts/shifts-browse.service';

const HEADER_BLUE = '#1E3A5F';
const PRIMARY = '#2563EB';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const CARD_BG = '#FFFFFF';
const PAGE_BG = '#F8FAFC';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function formatSectionTitle(isoDate: string | null): string {
  if (!isoDate) return 'Date TBD';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
}

function formatCardDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

type Section = { title: string; data: ShiftBrowseItem[] };

function groupByStartDate(shifts: ShiftBrowseItem[]): Section[] {
  const map = new Map<string, ShiftBrowseItem[]>();
  for (const s of shifts) {
    const key = s.start_date ?? '_none';
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === '_none') return 1;
    if (b === '_none') return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => ({
    title: formatSectionTitle(key === '_none' ? null : key),
    data: map.get(key) ?? [],
  }));
}

function matchesSearch(shift: ShiftBrowseItem, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  const title = (shift.title ?? '').toLowerCase();
  const cat = jobCategoryNameFromShift(shift).toLowerCase();
  const facName = (shift.facility?.name ?? '').toLowerCase();
  const addr = (shift.facility?.address ?? '').toLowerCase();
  return title.includes(s) || cat.includes(s) || facName.includes(s) || addr.includes(s);
}

function ShiftCard({
  shift,
  onDetails,
}: {
  shift: ShiftBrowseItem;
  onDetails: (id: string) => void;
}) {
  const rate = toNum(shift.rate_per_hour);
  const people = toNum(shift.number_of_people_needed);
  const est = estimateShiftPay(shift);
  const multi = isMultiShift(shift);
  const categoryName = jobCategoryNameFromShift(shift) || 'General';

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {shift.title?.trim() || 'Shift'}
          </Text>
          <Text style={styles.cardCategory} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
        {multi ? (
          <View style={styles.multiBadge}>
            <Ionicons name="sync" size={12} color={PRIMARY} />
            <Text style={styles.multiBadgeText}>Multi</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>{formatCardDate(shift.start_date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
          <Text style={styles.metaTextMuted}>Hours in details</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={16} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>
            {people != null && people > 0 ? `${people} People Needed` : 'Open roles'}
          </Text>
        </View>
      </View>

      <View style={styles.cardPayRow}>
        <Text style={styles.rateText}>{rate != null ? `${money(rate)} /hr` : 'Rate TBD'}</Text>
        {est != null ? <Text style={styles.estText}>Est. {money(est)}</Text> : null}
      </View>

      <Pressable
        style={({ pressed }) => [styles.detailsBtn, pressed && { opacity: 0.9 }]}
        onPress={() => onDetails(shift.id)}
      >
        <Text style={styles.detailsBtnText}>Details</Text>
      </Pressable>
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShiftBrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ExploreBrowseFilters>(() => ({
    ...DEFAULT_EXPLORE_FILTERS,
    roles: [...DEFAULT_EXPLORE_FILTERS.roles],
  }));

  const loadInitial = useCallback(async () => {
    setError(null);
    const { data, error: err, hasMore: more } = await fetchShiftsPage(0);
    if (err) {
      setError(err);
      setItems([]);
    } else {
      setItems(data ?? []);
      setHasMore(more);
    }
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const { data, error: err, hasMore: more } = await fetchShiftsPage(0);
    if (!err) {
      setItems(data ?? []);
      setHasMore(more);
    } else {
      setError(err);
    }
    setRefreshing(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const from = items.length;
    const { data, error: err, hasMore: more } = await fetchShiftsPage(from);
    if (!err && data?.length) {
      setItems((prev) => [...prev, ...data]);
      setHasMore(more);
    } else if (err) {
      setError(err);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, loading, items.length]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const filtered = useMemo(
    () =>
      items.filter(
        (s) => matchesSearch(s, search) && shiftMatchesExploreFilters(s, appliedFilters),
      ),
    [items, search, appliedFilters],
  );

  const sections = useMemo(() => groupByStartDate(filtered), [filtered]);

  const filtersActive = useMemo(() => hasActiveExploreFilters(appliedFilters), [appliedFilters]);

  const onDetails = useCallback(
    (id: string) => {
      router.push(`/shift/${id}` as const);
    },
    [router],
  );

  const headerGoBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading shifts…</Text>
        </View>
        <BottomNav active="explore" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ExploreFilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={setAppliedFilters}
        initial={appliedFilters}
      />
      <View style={styles.mainColumn}>
        <View style={styles.header}>
          <Pressable onPress={headerGoBack} style={styles.headerBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>Shifts</Text>
          <Pressable
            onPress={() => router.push('/explore-map')}
            style={styles.headerMapBtn}
            hitSlop={8}
            accessibilityLabel="Map view"
          >
            <Ionicons name="map-outline" size={24} color={HEADER_BLUE} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="location-outline" size={20} color={TEXT_SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Current Location"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          <Pressable
            style={styles.filterBtn}
            hitSlop={8}
            onPress={() => setFilterModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={filtersActive ? PRIMARY : TEXT_SECONDARY}
            />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadInitial()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <SectionList
          style={styles.listFlex}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ShiftCard shift={item} onDetails={onDetails} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (search.trim()) return;
            void loadMore();
          }}
          ListFooterComponent={
            hasMore && !search.trim() ? (
              <View style={styles.footer}>
                {loadingMore ? (
                  <ActivityIndicator color={PRIMARY} />
                ) : (
                  <Pressable onPress={() => void loadMore()}>
                    <Text style={styles.loadMoreText}>Load more</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={{ height: 24 }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No shifts match</Text>
              <Text style={styles.emptySub}>Try another search or pull to refresh.</Text>
            </View>
          }
        />
      </View>
      <BottomNav active="explore" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  mainColumn: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBack: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: HEADER_BLUE,
  },
  headerMapBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  filterBtn: {
    padding: 4,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  retryText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  cardCategory: {
    marginTop: 4,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  multiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  multiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
  },
  cardMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  metaTextMuted: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  cardPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  rateText: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  estText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
