import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthSession } from '@/hooks/use-auth-session';
import { fetchSupportTicketById, type SupportTicket } from '@/lib/support/support-tickets.service';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const PRIMARY = '#0D9488';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';

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

  const displayStatus = useMemo(() => {
    if (!ticket?.status) return 'Pending';
    switch (ticket.status) {
      case 'Open':
        return 'Pending';
      case 'In Progress':
        return 'In Progress';
      case 'Resolved':
        return 'Resolved';
      default:
        return ticket.status;
    }
  }, [ticket?.status]);

  const statusColor = useMemo(() => {
    switch (ticket?.status) {
      case 'Open':
        return '#F59E0B';
      case 'In Progress':
        return '#3B82F6';
      case 'Resolved':
        return '#10B981';
      default:
        return '#64748B';
    }
  }, [ticket?.status]);

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.card}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.loadingText}>Loading ticket details...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
              <Text style={styles.errorTitle}>Unable to load ticket</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={48} color={PRIMARY} />
              </View>
                  <Text style={styles.title}>Support Ticket Created</Text>
              <Text style={styles.subtext}>
                    Your support ticket has been created. Our team will get back to you shortly.
              </Text>

              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Ticket ID</Text>
                  <Text style={styles.value} numberOfLines={1}>{ticket?.id}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Subject</Text>
                  <Text style={styles.value}>{ticket?.subject || '-'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Message</Text>
                  <Text style={styles.value}>{ticket?.description || '-'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusText}>{displayStatus}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Created</Text>
                  <Text style={styles.value}>
                    {ticket?.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}
                  </Text>
                </View>
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}
            onPress={() => router.push({ pathname: '/messaging', params: { ticketCreated: '1' } })}
          >
            <Text style={styles.backButtonText}>Back to Messages</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
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
  successIconWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  subtext: {
    marginBottom: 20,
    textAlign: 'center',
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
  },
  detailRow: {
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
