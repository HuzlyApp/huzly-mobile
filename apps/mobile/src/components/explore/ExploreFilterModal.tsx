import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DEFAULT_EXPLORE_FILTERS,
  PAY_SLIDER_MAX,
  PAY_SLIDER_MIN,
  type ExploreBrowseFilters,
} from '@/lib/shifts/explore-filters';

const PRIMARY = '#2563EB';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const HEADER_BLUE = '#1E3A5F';

const DISTANCE_OPTIONS: { label: string; value: number }[] = [
  { label: '< 20 mins', value: 20 },
  { label: '< 30 mins', value: 30 },
  { label: '< 40 mins', value: 40 },
  { label: '< 60 mins', value: 60 },
];

const ROLE_OPTIONS = ['Picker/Packer', 'General Laborer', 'Forklift Operator'] as const;

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ExploreBrowseFilters) => void;
  initial: ExploreBrowseFilters;
};

function cloneFilters(f: ExploreBrowseFilters): ExploreBrowseFilters {
  return {
    ...f,
    roles: [...f.roles],
  };
}

export default function ExploreFilterModal({ visible, onClose, onApply, initial }: Props) {
  const [draft, setDraft] = useState<ExploreBrowseFilters>(() => cloneFilters(initial));

  useEffect(() => {
    if (!visible) return;
    setDraft(cloneFilters(initial));
  }, [visible, initial]);

  const payLabel = useMemo(
    () => `${money(draft.payMin)} - ${money(draft.payMax)} / hr`,
    [draft.payMin, draft.payMax],
  );

  const setPayMin = useCallback((v: number) => {
    setDraft((prev) => {
      const nextMin = Math.min(
        Math.max(PAY_SLIDER_MIN, Math.round(v)),
        PAY_SLIDER_MAX - 2,
      );
      const nextMax = Math.max(nextMin + 1, Math.min(PAY_SLIDER_MAX, prev.payMax));
      return { ...prev, payMin: nextMin, payMax: nextMax };
    });
  }, []);

  const setPayMax = useCallback((v: number) => {
    setDraft((prev) => {
      const nextMax = Math.round(v);
      return { ...prev, payMax: Math.max(nextMax, prev.payMin + 1) };
    });
  }, []);

  const toggleRole = useCallback((role: string) => {
    setDraft((prev) => {
      const has = prev.roles.includes(role);
      return {
        ...prev,
        roles: has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
      };
    });
  }, []);

  const clearDistance = useCallback(() => {
    setDraft((prev) => ({ ...prev, maxDistanceMins: null }));
  }, []);

  const clearDates = useCallback(() => {
    setDraft((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
  }, []);

  const clearTimes = useCallback(() => {
    setDraft((prev) => ({ ...prev, timeFrom: '', timeTo: '' }));
  }, []);

  const resetAll = useCallback(() => {
    setDraft(cloneFilters(DEFAULT_EXPLORE_FILTERS));
  }, []);

  const save = useCallback(() => {
    onApply(cloneFilters(draft));
    onClose();
  }, [draft, onApply, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close filters">
            <Ionicons name="close" size={26} color={TEXT_PRIMARY} />
          </Pressable>
          <Pressable onPress={save} style={styles.saveBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save filters">
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Max distance</Text>
              <Pressable onPress={clearDistance} hitSlop={8}>
                <Text style={styles.clearLink}>Clear</Text>
              </Pressable>
            </View>
            {DISTANCE_OPTIONS.map((opt) => {
              const selected = draft.maxDistanceMins === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={styles.radioRow}
                  onPress={() => setDraft((p) => ({ ...p, maxDistanceMins: opt.value }))}
                >
                  <Text style={styles.radioLabel}>{opt.label}</Text>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              <Pressable onPress={clearDates} hitSlop={8}>
                <Text style={styles.clearLink}>Clear</Text>
              </Pressable>
            </View>
            <View style={styles.twoCol}>
              <TextInput
                style={styles.underlineInput}
                placeholder="mm/dd/yy"
                placeholderTextColor="#94A3B8"
                value={draft.dateFrom}
                onChangeText={(dateFrom) => setDraft((p) => ({ ...p, dateFrom }))}
              />
              <TextInput
                style={styles.underlineInput}
                placeholder="mm/dd/yy"
                placeholderTextColor="#94A3B8"
                value={draft.dateTo}
                onChangeText={(dateTo) => setDraft((p) => ({ ...p, dateTo }))}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Time Range</Text>
              <Pressable onPress={clearTimes} hitSlop={8}>
                <Text style={styles.clearLink}>Clear</Text>
              </Pressable>
            </View>
            <View style={styles.twoCol}>
              <TextInput
                style={styles.underlineInput}
                placeholder="00:00"
                placeholderTextColor="#94A3B8"
                value={draft.timeFrom}
                onChangeText={(timeFrom) => setDraft((p) => ({ ...p, timeFrom }))}
              />
              <TextInput
                style={styles.underlineInput}
                placeholder="00:00"
                placeholderTextColor="#94A3B8"
                value={draft.timeTo}
                onChangeText={(timeTo) => setDraft((p) => ({ ...p, timeTo }))}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.payHeader}>
              <Text style={styles.sectionTitle}>Pay</Text>
              <Text style={styles.payValue}>{payLabel}</Text>
            </View>
            <Text style={styles.sliderCaption}>Minimum</Text>
            <Slider
              style={styles.slider}
              minimumValue={PAY_SLIDER_MIN}
              maximumValue={Math.max(PAY_SLIDER_MIN + 1, draft.payMax - 1)}
              step={1}
              value={draft.payMin}
              onValueChange={setPayMin}
              minimumTrackTintColor={PRIMARY}
              maximumTrackTintColor={BORDER}
              thumbTintColor="#FFFFFF"
            />
            <Text style={styles.sliderCaption}>Maximum</Text>
            <Slider
              style={styles.slider}
              minimumValue={Math.min(PAY_SLIDER_MAX - 1, draft.payMin + 1)}
              maximumValue={PAY_SLIDER_MAX}
              step={1}
              value={draft.payMax}
              onValueChange={setPayMax}
              minimumTrackTintColor={PRIMARY}
              maximumTrackTintColor={BORDER}
              thumbTintColor="#FFFFFF"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.rolesTitle]}>Roles</Text>
            {ROLE_OPTIONS.map((role, i) => {
              const checked = draft.roles.includes(role);
              return (
                <Pressable
                  key={role}
                  style={[styles.roleRow, i > 0 && styles.roleRowBorder]}
                  onPress={() => toggleRole(role)}
                >
                  <Text style={styles.roleLabel}>{role}</Text>
                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? PRIMARY : TEXT_SECONDARY} />
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.resetBtn} onPress={resetAll}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconBtn: {
    padding: 8,
    width: 44,
  },
  saveBtn: {
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: HEADER_BLUE,
  },
  clearLink: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  radioLabel: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TEXT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: PRIMARY,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
  },
  underlineInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payValue: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  sliderCaption: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 4,
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rolesTitle: {
    marginBottom: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  roleRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  roleLabel: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  resetBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
  },
});
