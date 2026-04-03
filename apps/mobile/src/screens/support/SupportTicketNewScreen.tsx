import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BottomNav from '@/components/ui/BottomNav';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ALLOWED_MIME_TYPES, type FileLike, validateAttachment } from '@/lib/messages/attachments.service';
import {
  createSupportTicket,
  fetchWorkerTicketCategories,
  uploadSupportTicketAttachment,
} from '@/lib/support/support-tickets.service';

import {
  SUPPORT_BG,
  SUPPORT_BORDER,
  SUPPORT_CARD,
  SUPPORT_MUTED,
  SUPPORT_PRIMARY,
  SUPPORT_TEXT,
} from './support-ui';

export default function SupportTicketNewScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuthSession();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [file, setFile] = useState<FileLike | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      const { data } = await fetchWorkerTicketCategories();
      if (c) return;
      setCategories(data ?? []);
      setCategory((data && data[0]) || '');
      setCategoriesLoading(false);
    })();
    return () => {
      c = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      !!session?.user?.id &&
      !submitting &&
      subject.trim().length > 0 &&
      category.trim().length > 0 &&
      description.trim().length > 0
    );
  }, [session?.user?.id, submitting, subject, category, description]);

  const pickFile = async () => {
    try {
      const mimeTypes =
        Platform.OS === 'web' ? ['image/*', 'application/pdf', '.docx', '.xlsx'] : [...ALLOWED_MIME_TYPES];
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const f: FileLike = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      };
      const v = validateAttachment(f);
      if (v) {
        setError(v);
        return;
      }
      setFile(f);
      setError(null);
    } catch {
      setError('Could not pick a file.');
    }
  };

  const submit = async () => {
    if (!canSubmit || !session?.user?.id) return;
    setSubmitting(true);
    setError(null);

    try {
      let attachmentBlock = '';
      if (file) {
        const { data: up, error: upErr } = await uploadSupportTicketAttachment(file, session.user.id);
        if (upErr || !up) throw new Error(upErr ?? 'Upload failed');
        attachmentBlock = [
          '',
          'Attachment:',
          `Name: ${up.fileName}`,
          `Type: ${up.fileType}`,
          `Size: ${up.fileSize} bytes`,
          `URL: ${up.fileUrl}`,
        ].join('\n');
      }

      const subj = urgent ? `[URGENT] ${subject.trim()}` : subject.trim();
      const desc = `${description.trim()}${attachmentBlock}`;

      const { data: ticket, error: crErr } = await createSupportTicket({
        userId: session.user.id,
        subject: subj,
        category: category.trim(),
        description: desc,
      });

      if (crErr || !ticket) throw new Error(crErr ?? 'Failed to create ticket');

      router.replace({ pathname: '/support/success', params: { id: ticket.id } } as any);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={SUPPORT_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.needAuth}>Sign in to create a ticket.</Text>
        <BottomNav active="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={24} color={SUPPORT_TEXT} />
          </Pressable>
          <Text style={styles.headerTitle}>New Ticket</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Category</Text>
          {categoriesLoading ? (
            <Text style={styles.muted}>Loading categories…</Text>
          ) : categories.length === 0 ? (
            <Text style={styles.muted}>No categories available.</Text>
          ) : (
            <View style={styles.dropdownWrap}>
              <Pressable style={styles.dropdownTrigger} onPress={() => setCategoryOpen((o) => !o)}>
                <Text style={[styles.dropdownText, !category && styles.placeholder]}>
                  {category || 'Select a category'}
                </Text>
                <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={18} color={SUPPORT_MUTED} />
              </Pressable>
              {categoryOpen ? (
                <View style={styles.menu}>
                  {categories.map((c) => (
                    <Pressable
                      key={c}
                      style={[styles.menuItem, c === category && styles.menuItemOn]}
                      onPress={() => {
                        setCategory(c);
                        setCategoryOpen(false);
                      }}
                    >
                      <Text style={[styles.menuItemText, c === category && styles.menuItemTextOn]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Short summary"
            placeholderTextColor="#94A3B8"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Describe your issue</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us what happened"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Upload file</Text>
          <Pressable style={styles.uploadBox} onPress={pickFile}>
            <Ionicons name="cloud-upload-outline" size={32} color={SUPPORT_PRIMARY} />
            <Text style={styles.uploadTitle}>Add screenshot / browse</Text>
            <Text style={styles.uploadHint}>Max 10 MB files are allowed</Text>
            {file ? <Text style={styles.fileName}>{file.name}</Text> : null}
          </Pressable>

          <View style={styles.urgentRow}>
            <Text style={styles.urgentLabel}>Mark as urgent</Text>
            <Switch
              value={urgent}
              onValueChange={setUrgent}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={urgent ? SUPPORT_PRIMARY : '#F8FAFC'}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.submit, !canSubmit && styles.submitDisabled]}
            onPress={submit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SUPPORT_BG },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  needAuth: { padding: 24, textAlign: 'center', color: SUPPORT_MUTED },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: SUPPORT_CARD,
    borderBottomWidth: 1,
    borderBottomColor: SUPPORT_BORDER,
  },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: SUPPORT_TEXT },
  scroll: { padding: 20, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '700', color: SUPPORT_TEXT, marginBottom: 8 },
  muted: { fontSize: 14, color: SUPPORT_MUTED },
  input: {
    borderWidth: 1,
    borderColor: SUPPORT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: SUPPORT_TEXT,
    backgroundColor: SUPPORT_CARD,
  },
  textarea: { minHeight: 140 },
  dropdownWrap: { zIndex: 2 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: SUPPORT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: SUPPORT_CARD,
  },
  dropdownText: { fontSize: 15, color: SUPPORT_TEXT, fontWeight: '600' },
  placeholder: { color: '#94A3B8', fontWeight: '500' },
  menu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: SUPPORT_BORDER,
    borderRadius: 12,
    backgroundColor: SUPPORT_CARD,
    overflow: 'hidden',
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemOn: { backgroundColor: '#EFF6FF' },
  menuItemText: { fontSize: 15, color: SUPPORT_TEXT },
  menuItemTextOn: { fontWeight: '700', color: SUPPORT_PRIMARY },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: SUPPORT_BORDER,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadTitle: { marginTop: 8, fontSize: 15, fontWeight: '600', color: SUPPORT_TEXT },
  uploadHint: { marginTop: 4, fontSize: 12, color: SUPPORT_MUTED },
  fileName: { marginTop: 10, fontSize: 12, color: SUPPORT_PRIMARY, fontWeight: '600' },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingVertical: 4,
  },
  urgentLabel: { fontSize: 15, fontWeight: '600', color: SUPPORT_TEXT },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  submit: {
    marginTop: 22,
    backgroundColor: SUPPORT_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
