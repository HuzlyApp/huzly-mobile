import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

import BottomNav from '@/components/ui/BottomNav';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  appendSupportTicketReply,
  fetchSupportTicketById,
  type SupportTicket,
} from '@/lib/support/support-tickets.service';

import SupportTicketBrandIcon from './SupportTicketBrandIcon';
import {
  SUPPORT_BG,
  SUPPORT_BORDER,
  SUPPORT_CARD,
  SUPPORT_MUTED,
  SUPPORT_PRIMARY,
  SUPPORT_TEXT,
  formatTicketRelativeTime,
  shortTicketId,
} from './support-ui';

export default function SupportTicketDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { user, loading: authLoading } = useAuthSession();
  const ticketId = useMemo(() => {
    const raw = params.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.id]);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !ticketId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchSupportTicketById(ticketId, user.id);
    if (err || !data) setError(err ?? 'Not found');
    else setTicket(data);
    setLoading(false);
  }, [user?.id, ticketId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id || !ticketId) {
      setError('Missing ticket.');
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, user?.id, ticketId, load]);

  const sid = ticket ? shortTicketId(ticket.id) : '';

  const sendReply = async () => {
    if (!user?.id || !ticketId || !reply.trim()) return;
    setSending(true);
    const { data, error: err } = await appendSupportTicketReply(ticketId, user.id, reply.trim());
    setSending(false);
    if (err || !data) {
      Alert.alert('Could not send', err ?? 'Try again later.');
      return;
    }
    setTicket(data);
    setReply('');
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.headerIcon}>
        <Ionicons name="chevron-back" size={24} color={SUPPORT_TEXT} />
      </Pressable>
      <Text style={styles.headerTitle}>My Ticket</Text>
      <View style={styles.headerIcon} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SUPPORT_PRIMARY} />
        </View>
        <BottomNav active="profile" />
      </SafeAreaView>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.center}>
          <Text style={styles.errText}>{error ?? 'Not found'}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
        <BottomNav active="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {header}

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.updateCard}>
            <View style={styles.updateTop}>
              <SupportTicketBrandIcon size={40} />
              <View style={styles.updateHeadText}>
                <Text style={styles.updateTitle}>New Ticket Updates</Text>
                <Text style={styles.updateSub}>
                  #{sid} · {formatTicketRelativeTime(ticket.created_at)}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert('Ticket', `${ticket.subject ?? 'No subject'}\n\nStatus: ${ticket.status}`)
                }
              >
                <Ionicons name="ellipsis-vertical" size={20} color={SUPPORT_MUTED} />
              </Pressable>
            </View>
            <Text style={styles.letterBody}>
              Dear Sir/Madam,{'\n\n'}
              Your support ticket #{sid} is on file. Below is the information we have on record. Our team will follow up
              as needed.{'\n\n'}
              <Text style={styles.letterBold}>Subject: </Text>
              {ticket.subject ?? '—'}
              {'\n\n'}
              <Text style={styles.letterBold}>Details:{'\n'}</Text>
              {ticket.description?.trim() || 'No additional details.'}
              {'\n\n'}
              Regards,{'\n'}
              Support Team
            </Text>
          </View>

          <Text style={styles.quickLabel}>Quick Reply</Text>
          <View style={styles.replyBar}>
            <Pressable style={styles.replyIcon} accessibilityLabel="Attach">
              <Ionicons name="attach-outline" size={22} color={SUPPORT_MUTED} />
            </Pressable>
            <Pressable style={styles.replyIcon} accessibilityLabel="Emoji">
              <Ionicons name="happy-outline" size={22} color={SUPPORT_MUTED} />
            </Pressable>
            <TextInput
              style={styles.replyInput}
              placeholder="Reply"
              placeholderTextColor="#94A3B8"
              value={reply}
              onChangeText={setReply}
              multiline
            />
            <Pressable
              style={[styles.sendCircle, (!reply.trim() || sending) && styles.sendDisabled]}
              onPress={sendReply}
              disabled={!reply.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#FFF" />
              )}
            </Pressable>
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable style={styles.chatCta} onPress={() => router.push('/messaging' as any)}>
            <Text style={styles.chatCtaText}>Chat with Support</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  scroll: { padding: 16, paddingBottom: 32 },
  updateCard: {
    backgroundColor: SUPPORT_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SUPPORT_BORDER,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  updateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  updateHeadText: { flex: 1 },
  updateTitle: { fontSize: 16, fontWeight: '800', color: SUPPORT_TEXT },
  updateSub: { fontSize: 12, color: SUPPORT_MUTED, marginTop: 2 },
  letterBody: {
    fontSize: 14,
    lineHeight: 22,
    color: SUPPORT_TEXT,
  },
  letterBold: { fontWeight: '700' },
  quickLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: SUPPORT_TEXT,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: SUPPORT_CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: SUPPORT_BORDER,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 4,
  },
  replyIcon: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: SUPPORT_TEXT,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  sendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SUPPORT_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: SUPPORT_BORDER },
  orText: { fontSize: 12, fontWeight: '700', color: SUPPORT_MUTED },
  chatCta: {
    backgroundColor: SUPPORT_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chatCtaText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  errText: { textAlign: 'center', color: '#B91C1C', marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  backBtnText: { color: SUPPORT_PRIMARY, fontWeight: '700' },
});
