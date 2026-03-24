import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
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

import { fetchContacts, type Contact } from '@/lib/messages/messages.service';
import {
  fetchSupportTicketsByUser,
  type SupportTicket,
} from '@/lib/support/support-tickets.service';
import { useAuthSession } from '@/hooks/use-auth-session';

const BG = '#FFFFFF';
const SURFACE = '#F8FAFC';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';
const TEAL = '#0D9488';

export default function MessagingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ticketCreated?: string | string[] }>();
  const { session, loading: authLoading } = useAuthSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!session || !session.user) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [contactsResult, ticketsResult] = await Promise.all([
        fetchContacts(),
        fetchSupportTicketsByUser(session.user.id),
      ]);

      if (contactsResult.error) {
        setError(contactsResult.error);
      } else {
        setContacts(contactsResult.data || []);
      }

      if (ticketsResult.error) {
        setError(ticketsResult.error);
      } else {
        setTickets(ticketsResult.data || []);
      }
      setLoading(false);
    };

    loadData();
  }, [authLoading, session]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && session?.user) {
        const refreshData = async () => {
          const [contactsResult, ticketsResult] = await Promise.all([
            fetchContacts(),
            fetchSupportTicketsByUser(session.user.id),
          ]);

          if (contactsResult.error) {
            setError(contactsResult.error);
          } else {
            setContacts(contactsResult.data || []);
          }

          if (ticketsResult.error) {
            setError(ticketsResult.error);
          } else {
            setTickets(ticketsResult.data || []);
          }
        };
        refreshData();
      }
    }, [authLoading, session])
  );

  const handleContactPress = (contact: Contact) => {
    router.push({
      pathname: '/messaging/chat',
      params: {
        receiver_id: contact.user_id,
        receiver_name: contact.company_name,
      },
    });
  };

  const handleTicketPress = (ticket: SupportTicket) => {
    router.push(`/support/ticket/${ticket.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return '#F59E0B';
      case 'in progress':
        return '#3B82F6';
      case 'resolved':
        return '#10B981';
      default:
        return TEXT_SECONDARY;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Pressable style={styles.headerAction} accessibilityLabel="Search">
          <Ionicons name="search-outline" size={22} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      {params.ticketCreated === '1' && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#166534" style={{ marginRight: 6 }} />
          <Text style={styles.successText}>
            Ticket submitted. Expect a response within 24 hours.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubbles-outline" size={18} color={TEAL} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Contacts</Text>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="people-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptySectionTitle}>No Contacts Yet</Text>
            <Text style={styles.emptySectionText}>Your client contacts will appear here</Text>
          </View>
        ) : (
          contacts.map((item) => (
            <Pressable
              key={item.user_id}
              style={({ pressed }) => [styles.contactItem, pressed && styles.contactItemPressed]}
              onPress={() => handleContactPress(item)}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {item.company_name.charAt(0).toUpperCase()}
                </Text>
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.company_name}</Text>
                <Text style={styles.contactSubtext}>Tap to start chatting</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </Pressable>
          ))
        )}

        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Ionicons name="ticket-outline" size={18} color={TEAL} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Support Tickets</Text>
          <Text style={styles.sectionBadge}>{tickets.length}</Text>
        </View>

        {tickets.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="document-text-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptySectionTitle}>No Tickets</Text>
            <Text style={styles.emptySectionText}>Support tickets you create will appear here</Text>
          </View>
        ) : (
          tickets.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.ticketItem, pressed && styles.ticketItemPressed]}
              onPress={() => handleTicketPress(item)}
            >
              <View style={styles.ticketContent}>
                <Text style={styles.ticketSubject} numberOfLines={1}>
                  {item.subject || 'Support Request'}
                </Text>
                <View style={styles.ticketMetaRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={styles.ticketMeta}>{item.status}</Text>
                  <Text style={styles.ticketMetaDivider}>•</Text>
                  <Text style={styles.ticketMeta}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </Pressable>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  sectionBadge: {
    marginLeft: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    overflow: 'hidden',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  emptySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 10,
  },
  emptySectionText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative' as const,
  },
  contactAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute' as const,
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2DD4BF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  contactSubtext: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ticketItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  ticketContent: {
    flex: 1,
    marginRight: 8,
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  ticketMeta: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  ticketMetaDivider: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 6,
  },
});
