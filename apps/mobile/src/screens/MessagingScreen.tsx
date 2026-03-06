/**
 * MessagingScreen.tsx
 *
 * Main messaging hub displaying list of contacts (clients).
 * Users can select a contact to start or continue a conversation.
 */

import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchContacts, type Contact } from '@/lib/messages/messages.service';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeColor } from '@/hooks/use-theme-color';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const CONTACT_ITEM_BG = '#F9FAFB';
const CONTACT_HOVER = '#F3F4F6';

export default function MessagingScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuthSession();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load contacts whenever auth state changes
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

    const loadContactsAsync = async () => {
      setLoading(true);
      setError(null);

      const result = await fetchContacts();
      if (result.error) {
        setError(result.error);
      } else {
        setContacts(result.data || []);
      }
      setLoading(false);
    };

    loadContactsAsync();
  }, [authLoading, session]);

  // Refresh contacts when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && session?.user) {
        const refreshContacts = async () => {
          const result = await fetchContacts();
          if (result.error) {
            setError(result.error);
          } else {
            setContacts(result.data || []);
          }
        };
        refreshContacts();
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BG }]} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B6FD8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG }]} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Messages</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Contacts Available</Text>
          <Text style={[styles.emptyText, { color: textColor }]}>
            You don't have any client contacts yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.contactItem,
                pressed && styles.contactItemPressed,
              ]}
              onPress={() => handleContactPress(item)}
            >
              <View style={styles.contactContent}>
                <View style={styles.contactIcon}>
                  <Text style={styles.contactIconText}>
                    {item.company_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: textColor }]}>
                    {item.company_name}
                  </Text>
                </View>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </Pressable>
          )}
          keyExtractor={(item) => item.user_id}
          scrollEnabled
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  contactItemPressed: {
    backgroundColor: CONTACT_HOVER,
  },
  contactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B6FD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactArrow: {
    fontSize: 24,
    color: TEXT_SECONDARY,
    marginLeft: 12,
  },
});
