import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { subject: string; category: string; description: string }) => Promise<void>;
  userId: string;
  chatPartnerLabel?: string;
  defaultSubject: string;
  categories: string[];
  categoriesLoading?: boolean;
  defaultDescription: string;
};

export default function SupportTicketCreateModal({
  visible,
  onClose,
  onSubmit,
  userId,
  chatPartnerLabel,
  defaultSubject,
  categories,
  categoriesLoading,
  defaultDescription,
}: Props) {
  const [subject, setSubject] = useState(defaultSubject);
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [description, setDescription] = useState(defaultDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSubject(defaultSubject);
    setCategory(categories[0] ?? '');
    setCategoryOpen(false);
    setDescription(defaultDescription);
    setSubmitting(false);
    setError(null);
  }, [visible, defaultSubject, defaultDescription, categories]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    return subject.trim().length > 0 && category.trim().length > 0 && description.trim().length > 0;
  }, [category, description, subject, submitting]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        subject: subject.trim(),
        category: category.trim(),
        description: description.trim(),
      });
      setSubmitting(false);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create ticket.');
      setSubmitting(false);
      return;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
            </View>
              <Text style={styles.modalTitle}>Create Support Ticket</Text>
            </View>

            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Submitting as</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {userId}
              </Text>
              {chatPartnerLabel ? (
                <>
                  <Text style={[styles.infoLabel, { marginTop: 12 }]}>Chat partner</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {chatPartnerLabel}
                  </Text>
                </>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Topic / Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter a short subject"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="sentences"
                editable={!submitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              {categoriesLoading ? (
                <Text style={styles.helperText}>Loading categories...</Text>
              ) : categories.length === 0 ? (
                <Text style={styles.helperText}>No categories available.</Text>
              ) : (
                <View style={styles.dropdownWrap}>
                  <Pressable
                    style={styles.dropdownTrigger}
                    onPress={() => setCategoryOpen((prev) => !prev)}
                    disabled={submitting}
                  >
                    <Text style={[styles.dropdownTriggerText, !category && styles.dropdownPlaceholder]}>
                      {category || 'Select a category'}
                    </Text>
                    <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
                  </Pressable>

                  {categoryOpen ? (
                    <View style={styles.dropdownMenu}>
                      {categories.map((item) => {
                        const active = item === category;
                        return (
                          <Pressable
                            key={item}
                            style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                            onPress={() => {
                              setCategory(item);
                              setCategoryOpen(false);
                            }}
                            disabled={submitting}
                          >
                            <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                              {item}
                            </Text>
                            {active ? <Ionicons name="checkmark" size={16} color="#4473C0" /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Message / Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what you need help with"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={submitting}>
                <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, !canSubmit && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.btnPrimaryText}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    overflow: 'hidden',
    maxHeight: 640,
  },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#4473C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    padding: 14,
    gap: 14,
  },
  infoBlock: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E6EEF6',
    borderRadius: 14,
    padding: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E6EEF6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
  },
  textArea: {
    minHeight: 140,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
  },
  dropdownWrap: {
    gap: 8,
  },
  dropdownTrigger: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#E6EEF6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 180,
  },
  dropdownItem: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EEF3FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#4473C0',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEF6',
  },
  btnGhostText: {
    color: '#0F172A',
  },
  btnPrimary: {
    backgroundColor: '#4473C0',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

