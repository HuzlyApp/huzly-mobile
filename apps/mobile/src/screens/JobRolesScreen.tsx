import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#FFFFFF';
const CARD_BG = '#F9FAFB';
const BORDER = '#AABEE1';

const TEXT_PRIMARY = '#000000';
const TEXT_SECONDARY = '#4B5563';
const TEXT_MUTED = '#9CA3AF';

const BLUE_600 = '#4473C0';
const BLUE_700 = '#1D4ED8';
const BLUE_50 = '#EFF6FF';

const WHITE = '#FFFFFF';

type Role = {
  id: string;
  name: string;
  categoryId: string;
};

type RoleCategory = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: RoleCategory[] = [
  {
    id: 'warehouse',
    name: 'Warehouse & Logistics',
    icon: 'home-outline',
  },
  {
    id: 'event',
    name: 'Event Staffing',
    icon: 'sparkles-outline',
  },
  {
    id: 'hotel',
    name: 'Hotel & Hospitality',
    icon: 'business-outline',
  },
];

// Hardcoded roles for now (Supabase-ready later)
const ROLES: Role[] = [
  { id: 'picker_packer', name: 'Picker/Packer', categoryId: 'warehouse' },
  { id: 'general_laborer', name: 'General Laborer', categoryId: 'warehouse' },
  { id: 'forklift_operator', name: 'Forklift Operator', categoryId: 'warehouse' },

  { id: 'server', name: 'Server', categoryId: 'event' },
  { id: 'bartender', name: 'Bartender', categoryId: 'event' },
  { id: 'event_setup', name: 'Event Setup Crew', categoryId: 'event' },

  { id: 'housekeeping', name: 'Housekeeping', categoryId: 'hotel' },
  { id: 'front_desk', name: 'Front Desk', categoryId: 'hotel' },
  { id: 'kitchen_staff', name: 'Kitchen Staff', categoryId: 'hotel' },
];

type ChipProps = {
  label: string;
  onRemove?: () => void;
};

function Chip({ label, onRemove }: ChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={styles.chipRemove}
        >
          <Ionicons name="close" size={14} color={WHITE} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function JobRolesScreen() {
  const router = useRouter();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('warehouse');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Record<string, string[]>>({
    warehouse: ['picker_packer', 'general_laborer'],
    event: [],
    hotel: [],
  });

  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);

  // Supabase-ready stub (NOT integrated yet)
  // const fetchRolesFromSupabase = async () => {
  //   // Example (you will wire your supabase client here):
  //   // const { data, error } = await supabase.from('roles').select('*');
  //   // if (error) throw error;
  //   // return data;
  // };

  const rolesByCategory = useMemo(() => {
    const map: Record<string, Role[]> = {};
    for (const c of CATEGORIES) map[c.id] = [];
    for (const role of ROLES) {
      if (!map[role.categoryId]) map[role.categoryId] = [];
      map[role.categoryId].push(role);
    }
    return map;
  }, []);

  const selectedRolesForCategory = useMemo(() => {
    const ids = selectedRoleIds[selectedCategoryId] ?? [];
    const roleMap = new Map(ROLES.map((r) => [r.id, r]));
    return ids.map((id) => roleMap.get(id)).filter(Boolean) as Role[];
  }, [selectedCategoryId, selectedRoleIds]);

  const canSave = useMemo(() => {
    return Object.values(selectedRoleIds).some((arr) => (arr?.length ?? 0) > 0);
  }, [selectedRoleIds]);

  const handleBack = () => router.back();

  const handleSkip = () => {
    // TODO: align to your onboarding flow
    // router.push('/(tabs)');
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    // Keep picker closed by default; user taps input to open
    setIsRolePickerOpen(false);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const current = prev[selectedCategoryId] ?? [];
      const exists = current.includes(roleId);

      const nextForCat = exists ? current.filter((id) => id !== roleId) : [...current, roleId];

      return {
        ...prev,
        [selectedCategoryId]: nextForCat,
      };
    });
  };

  const removeRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const current = prev[selectedCategoryId] ?? [];
      return { ...prev, [selectedCategoryId]: current.filter((id) => id !== roleId) };
    });
  };

  const handleSave = () => {
    if (!canSave) return;

    // TODO: persist to store/context or api later
    // Example:
    // await saveSelectedRoles(selectedRoleIds);

    // TODO: go to next onboarding step
    // router.push('/onboarding-steps'); or router.push('/requirements') ...
  };

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === selectedCategoryId),
    [selectedCategoryId],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={styles.headerLeft}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </Pressable>

          <Text style={styles.headerTitle}>Job Roles</Text>

          <Pressable
            onPress={handleSkip}
            hitSlop={10}
            style={styles.headerRight}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>

        {/* Intro */}
        <Text style={styles.pageTitle}>Choose a Role</Text>
        <Text style={styles.pageSubtitle}>
          Click the job categories and you can check all the job vacancies that fits you.
        </Text>

        {/* Categories */}
        <View style={styles.categoryList}>
          {CATEGORIES.map((cat) => {
            const isActive = cat.id === selectedCategoryId;
            const checked = (selectedRoleIds[cat.id]?.length ?? 0) > 0;

            return (
              <View key={cat.id} style={[styles.categoryCard, isActive && styles.categoryCardActive]}>
                <Pressable
                  onPress={() => handleSelectCategory(cat.id)}
                  style={styles.categoryTopRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${cat.name}`}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                      <Ionicons
                        name={cat.icon}
                        size={18}
                        color={isActive ? BLUE_700 : TEXT_SECONDARY}
                      />
                    </View>
                    <Text style={styles.categoryTitle}>{cat.name}</Text>
                  </View>

                  {/* Checkbox indicator */}
                  <View
                    style={[
                      styles.categoryCheck,
                      checked && styles.categoryCheckChecked,
                      !checked && styles.categoryCheckEmpty,
                    ]}
                  >
                    {checked ? <Ionicons name="checkmark" size={14} color={WHITE} /> : null}
                  </View>
                </Pressable>

                {/* Expanded panel only for active category */}
                {isActive ? (
                  <View style={styles.expandArea}>
                    <Text style={styles.addRoleLabel}>Add Role</Text>

                    <Pressable
                      onPress={() => setIsRolePickerOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Open role picker"
                      style={styles.roleInputWrap}
                    >
                      <Ionicons name="search" size={18} color={TEXT_MUTED} />
                      <TextInput
                        pointerEvents="none"
                        editable={false}
                        value=""
                        placeholder="Type role"
                        placeholderTextColor={TEXT_MUTED}
                        style={styles.roleInput}
                      />
                      <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
                    </Pressable>

                    {/* Suggestion chips (first mock state like figma #1) */}
                    <View style={styles.suggestionRow}>
                      {(rolesByCategory[selectedCategoryId] ?? []).slice(0, 3).map((r) => {
                        const selected = (selectedRoleIds[selectedCategoryId] ?? []).includes(r.id);
                        return (
                          <Pressable
                            key={r.id}
                            onPress={() => toggleRole(r.id)}
                            style={[
                              styles.suggestionChip,
                              selected && styles.suggestionChipSelected,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${r.name}`}
                          >
                            <Text
                              style={[
                                styles.suggestionChipText,
                                selected && styles.suggestionChipTextSelected,
                              ]}
                            >
                              {r.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Selected chips (second figma state) */}
                    {selectedRolesForCategory.length > 0 ? (
                      <View style={styles.selectedRow}>
                        {selectedRolesForCategory.map((r) => (
                          <Chip key={r.id} label={r.name} onRemove={() => removeRole(r.id)} />
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.footerButton, styles.footerButtonGhost, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.footerGhostText}>Back</Text>
          </Pressable>

          <Pressable
            disabled={!canSave}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.footerButton,
              styles.footerButtonPrimary,
              !canSave && { opacity: 0.5 },
              pressed && canSave && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.footerPrimaryText}>Save</Text>
          </Pressable>
        </View>

        {/* Role Picker Modal */}
        <Modal
          visible={isRolePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsRolePickerOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsRolePickerOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => null}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeCategory ? `${activeCategory.name} roles` : 'Roles'}
                </Text>
                <Pressable
                  onPress={() => setIsRolePickerOpen(false)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close role picker"
                >
                  <Ionicons name="close" size={20} color={TEXT_PRIMARY} />
                </Pressable>
              </View>

              <FlatList
                data={rolesByCategory[selectedCategoryId] ?? []}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                renderItem={({ item }) => {
                  const selected = (selectedRoleIds[selectedCategoryId] ?? []).includes(item.id);
                  return (
                    <Pressable
                      onPress={() => toggleRole(item.id)}
                      style={styles.modalRow}
                      accessibilityRole="button"
                      accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${item.name}`}
                    >
                      <Text style={styles.modalRowText}>{item.name}</Text>
                      <View style={[styles.modalCheck, selected && styles.modalCheckSelected]}>
                        {selected ? <Ionicons name="checkmark" size={14} color={WHITE} /> : null}
                      </View>
                    </Pressable>
                  );
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BACKGROUND,
  },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerLeft: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRight: {
    width: 90,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
    color: BLUE_600,
  },

  pageTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },

  categoryList: {
    marginTop: 14,
    gap: 12,
    flex: 1,
  },

  categoryCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: WHITE,
    padding: 12,
  },
  categoryCardActive: {
    borderColor: BLUE_600,
    backgroundColor: CARD_BG,
  },
  categoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  iconBoxActive: {
    backgroundColor: BLUE_50,
    borderColor: BLUE_600,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
  },

  categoryCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCheckEmpty: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  categoryCheckChecked: {
    backgroundColor: BLUE_600,
    borderWidth: 1,
    borderColor: BLUE_600,
  },

  expandArea: {
    marginTop: 12,
  },
  addRoleLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },

  roleInputWrap: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleInput: {
    flex: 1,
    fontSize: 12,
    color: TEXT_PRIMARY,
  },

  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: BLUE_600,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: WHITE,
  },
  suggestionChipSelected: {
    backgroundColor: BLUE_50,
    borderColor: BLUE_600,
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: BLUE_600,
  },
  suggestionChipTextSelected: {
    color: BLUE_700,
  },

  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE_600,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: WHITE,
    maxWidth: 160,
  },
  chipRemove: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE_700,
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonGhost: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  footerButtonPrimary: {
    backgroundColor: BLUE_600,
  },
  footerGhostText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  footerPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHITE,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    maxHeight: 420,
  },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 10,
  },
  modalDivider: {
    height: 1,
    backgroundColor: BORDER,
  },
  modalRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalRowText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  modalCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCheckSelected: {
    borderColor: BLUE_600,
    backgroundColor: BLUE_600,
  },
});