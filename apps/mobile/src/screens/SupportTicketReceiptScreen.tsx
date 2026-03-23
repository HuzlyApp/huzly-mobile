import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/hooks/use-auth-session';
import { fetchSupportTicketById, type SupportTicket } from '@/lib/support/support-tickets.service';

const BG = '#F9FAFB';
const CARD_BG = '#FFFFFF';
const PRIMARY = '#3B6FD8';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';

export default function SupportTicketReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { user, loading: authLoading } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ticketId = useMemo(() => {
    const rawId = params.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params.id]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user?.id) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    if (!ticketId) {
      setError('Ticket ID is missing.');
      setLoading(false);
      return;
    }

    const loadTicket = async () => {
      setLoading(true);
      setError(null);

      const { data, error: ticketError } = await fetchSupportTicketById(ticketId, user.id);

      if (ticketError || !data) {
        setError(ticketError ?? 'Ticket not found.');
        setLoading(false);
        return;
      }

      setTicket(data);
      setLoading(false);
    };

    loadTicket();
  }, [authLoading, ticketId, user?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.loadingText}>Loading ticket details...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorTitle}>Unable to load ticket</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.title}>Support Ticket Submitted</Text>
              <Text style={styles.subtext}>
                Please wait within 24 hours for a response from our support team.
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Ticket ID</Text>
                <Text style={styles.value}>{ticket?.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Subject</Text>
                <Text style={styles.value}>{ticket?.subject || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Message</Text>
                <Text style={styles.value}>{ticket?.description || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.value}>{ticket?.status || 'Open'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Created At</Text>
                <Text style={styles.value}>
                  {ticket?.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}
                </Text>
              </View>
            </>
          )}

          <Pressable
            style={styles.backButton}
            onPress={() => router.push({ pathname: '/messaging', params: { ticketCreated: '1' } })}
          >
            <Text style={styles.backButtonText}>Back to Messaging</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  centerContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  successIcon: {
    fontSize: 28,
    textAlign: 'center',
  },
  title: {
    marginTop: 10,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  subtext: {
    marginBottom: 16,
    textAlign: 'center',
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  detailRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 10,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
