import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { fetchContacts, type Contact } from '@/lib/messages/messages.service';
import { useAuthSession } from '@/hooks/use-auth-session';
import BottomNav from '@/components/ui/BottomNav';
import { useMessageNotifications } from '@/contexts/MessageNotificationsContext';

const BG = '#FFFFFF';
const SURFACE = '#F8FAFC';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';
const TEAL = '#0D9488';
const NAVY = '#1E3A5F';
const BLUE = '#2563EB';

export default function MessagingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ticketCreated?: string | string[] }>();
  const { session, loading: authLoading } = useAuthSession();
  const { unreadBySenderId, refreshUnreadCounts } = useMessageNotifications();
  const [contacts, setContacts] = useState<Contact[]>([]);
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

      const contactsResult = await fetchContacts();

      if (contactsResult.error) {
        setError(contactsResult.error);
      } else {
        setContacts(contactsResult.data || []);
      }

      setLoading(false);
    };

    loadData();
  }, [authLoading, session]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && session?.user) {
        const refreshData = async () => {
          const contactsResult = await fetchContacts();

          if (contactsResult.error) {
            setError(contactsResult.error);
          } else {
            setContacts(contactsResult.data || []);
          }
        };
        refreshData();
        void refreshUnreadCounts();
      }
    }, [authLoading, session, refreshUnreadCounts])
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
        <BottomNav active="message" />
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
            Ticket submitted. Open{' '}
            <Text style={styles.successLink} onPress={() => router.push('/support' as any)}>
              My Tickets
            </Text>{' '}
            to track it.
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
          contacts.map((item) => {
            const unread = unreadBySenderId[item.user_id] ?? 0;
            return (
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
                  {unread > 0 ? (
                    <View style={styles.contactUnreadBadge}>
                      <Text style={styles.contactUnreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, unread > 0 && styles.contactNameUnread]}>
                    {item.company_name}
                  </Text>
                  <Text style={[styles.contactSubtext, unread > 0 && styles.contactSubtextUnread]}>
                    {unread > 0 ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'Tap to start chatting'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </Pressable>
            );
          })
        )}

        <Pressable
          style={({ pressed }) => [styles.ticketsHubCard, pressed && styles.ticketsHubCardPressed]}
          onPress={() => router.push('/support' as any)}
        >
          <View style={styles.ticketsHubIcon}>
            <Ionicons name="headset" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.ticketsHubTextWrap}>
            <Text style={styles.ticketsHubTitle}>My Tickets</Text>
            <Text style={styles.ticketsHubSub}>View open and closed support tickets</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="message" />
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
  successLink: {
    fontWeight: '800',
    color: BLUE,
    textDecorationLine: 'underline',
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
  ticketsHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: BG,
  },
  ticketsHubCardPressed: {
    backgroundColor: SURFACE,
  },
  ticketsHubIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketsHubTextWrap: { flex: 1 },
  ticketsHubTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  ticketsHubSub: {
    marginTop: 2,
    fontSize: 13,
    color: TEXT_SECONDARY,
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
  contactNameUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  contactSubtext: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  contactSubtextUnread: {
    fontWeight: '600',
    color: TEAL,
  },
  contactUnreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contactUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
