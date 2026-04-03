import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BottomNav from '@/components/ui/BottomNav';
import {
  buildMonthGrid,
  isDateInShiftRange,
  toIsoKey,
  weekdayDatesInRange,
} from '@/lib/shifts/shift-schedule-dates';
import { fetchShiftById, isMultiShift, type ShiftBrowseItem } from '@/lib/shifts/shifts-browse.service';

const PRIMARY = '#2563EB';
const HEADER_BLUE = '#1E3A5F';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const CARD_BORDER_BLUE = '#93C5FD';
const PAGE_BG = '#F8FAFC';

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function ShiftSchedulesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shift, setShift] = useState<ShiftBrowseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'calendar' | 'list'>('calendar');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) {
        setError('Missing shift');
        setLoading(false);
        return;
      }
      const { data, error: err } = await fetchShiftById(String(id));
      if (cancelled) return;
      if (err || !data) {
        setError(err ?? 'Not found');
        setShift(null);
      } else {
        setShift(data);
        setError(null);
        const keys = weekdayDatesInRange(data.start_date, data.end_date ?? data.start_date);
        const cap = Math.min(20, keys.length);
        const start = data.start_date ? new Date(`${data.start_date}T12:00:00`) : new Date();
        if (!Number.isNaN(start.getTime())) {
          const c = new Date(start.getFullYear(), start.getMonth(), 1, 12, 0, 0, 0);
          setCursor(c);
        }
        const initial = new Set(keys.slice(0, Math.min(3, cap)));
        setSelected(initial);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const workdayKeys = useMemo(
    () => weekdayDatesInRange(shift?.start_date ?? null, shift?.end_date ?? shift?.start_date ?? null),
    [shift],
  );

  const maxSelectable = useMemo(() => Math.min(20, workdayKeys.length), [workdayKeys.length]);

  const toggleKey = useCallback(
    (key: string) => {
      if (!workdayKeys.includes(key)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else if (next.size < maxSelectable) next.add(key);
        return next;
      });
    },
    [workdayKeys, maxSelectable],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(cursor),
    [cursor],
  );

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const goPrevMonth = useCallback(() => {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1, 12, 0, 0, 0));
  }, []);

  const goNextMonth = useCallback(() => {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0, 0));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
        <BottomNav active="explore" />
      </SafeAreaView>
    );
  }

  if (error || !shift) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>Shift Schedules</Text>
          <View style={styles.headerIcon} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.err}>{error ?? 'Unavailable'}</Text>
        </View>
        <BottomNav active="explore" />
      </SafeAreaView>
    );
  }

  const multi = isMultiShift(shift);
  const companyName = shift.facility?.name?.trim() || 'Employer';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Shift Schedules
        </Text>
        <Pressable onPress={() => router.push('/messaging')} style={styles.headerIcon} accessibilityLabel="Messages">
          <Ionicons name="chatbubble-outline" size={22} color={HEADER_BLUE} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.brandIcon}>
            <Ionicons name="business" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {shift.title?.trim() || 'Shift'}
            </Text>
            <Text style={styles.summarySub} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
          {multi ? (
            <View style={styles.multiBadge}>
              <Ionicons name="sync" size={12} color={PRIMARY} />
              <Text style={styles.multiBadgeText}>Multi</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.toolbar}>
          <Text style={styles.toolbarCount}>
            {selected.size} of {maxSelectable} jobs selected
          </Text>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setMode('calendar')}
              style={[styles.segmentBtn, mode === 'calendar' && styles.segmentBtnOn]}
            >
              <Text style={[styles.segmentText, mode === 'calendar' && styles.segmentTextOn]}>Calendar</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('list')}
              style={[styles.segmentBtn, mode === 'list' && styles.segmentBtnOn]}
            >
              <Text style={[styles.segmentText, mode === 'list' && styles.segmentTextOn]}>List</Text>
            </Pressable>
          </View>
        </View>

        {mode === 'calendar' ? (
          <View style={styles.calendarCard}>
            <View style={styles.calHeader}>
              <Pressable onPress={goPrevMonth} style={styles.calNavHit} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={HEADER_BLUE} />
              </Pressable>
              <Text style={styles.calMonth}>{monthLabel}</Text>
              <Pressable onPress={goNextMonth} style={styles.calNavHit} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color={HEADER_BLUE} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEK_LABELS.map((w) => (
                <Text key={w} style={styles.weekLabel}>
                  {w}
                </Text>
              ))}
            </View>

            {grid.map((row, ri) => (
              <View key={ri} style={styles.calRow}>
                {row.map((cell, ci) => {
                  const key = toIsoKey(cell.date);
                  const inRange = isDateInShiftRange(cell.date, shift.start_date, shift.end_date ?? shift.start_date);
                  const isSel = selected.has(key);
                  const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                  const showRing = inRange && !isWeekend && cell.inMonth;

                  return (
                    <Pressable
                      key={ci}
                      style={styles.cellOuter}
                      onPress={() => inRange && !isWeekend && toggleKey(key)}
                      disabled={!inRange || isWeekend}
                    >
                      <View
                        style={[
                          styles.cellInner,
                          !cell.inMonth && styles.cellMuted,
                          showRing && !isSel && styles.cellRing,
                          isSel && styles.cellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellText,
                            !cell.inMonth && styles.cellTextMuted,
                            showRing && !isSel && styles.cellTextRing,
                            isSel && styles.cellTextOnDark,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listCard}>
            <FlatList
              data={workdayKeys}
              keyExtractor={(k) => k}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.listSep} />}
              renderItem={({ item }) => {
                const d = new Date(`${item}T12:00:00`);
                const label = Number.isNaN(d.getTime())
                  ? item
                  : new Intl.DateTimeFormat('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(d);
                const on = selected.has(item);
                return (
                  <Pressable style={styles.listRow} onPress={() => toggleKey(item)}>
                    <View style={[styles.listCheck, on && styles.listCheckOn]}>
                      {on ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
                    </View>
                    <Text style={styles.listRowText}>{label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="explore" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: HEADER_BLUE },
  body: { padding: 16, paddingBottom: 8 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: HEADER_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  summarySub: { marginTop: 2, fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },
  multiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  multiBadgeText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  toolbar: { marginBottom: 12, gap: 10 },
  toolbarCount: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    alignSelf: 'stretch',
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentBtnOn: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  segmentTextOn: { color: PRIMARY },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER_BLUE,
    padding: 12,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  calNavHit: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  calMonth: { fontSize: 16, fontWeight: '800', color: HEADER_BLUE },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: TEXT_SECONDARY },
  calRow: { flexDirection: 'row', marginBottom: 6 },
  cellOuter: { flex: 1, padding: 2 },
  cellInner: {
    flex: 1,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  cellMuted: { opacity: 0.45 },
  cellRing: {
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: '#FFF',
  },
  cellSelected: {
    backgroundColor: PRIMARY,
    borderWidth: 0,
  },
  cellText: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  cellTextMuted: { color: TEXT_SECONDARY, fontWeight: '600' },
  cellTextRing: { color: PRIMARY },
  cellTextOnDark: { color: '#FFF' },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  listCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCheckOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  listRowText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY, flex: 1 },
  listSep: { height: 1, backgroundColor: BORDER, marginLeft: 50 },
  err: { fontSize: 16, color: '#B91C1C', textAlign: 'center' },
});
