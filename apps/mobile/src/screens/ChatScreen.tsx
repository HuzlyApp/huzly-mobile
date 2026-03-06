/**
 * ChatScreen.tsx
 *
 * Messaging interface for one-on-one conversations.
 * Displays message history and allows sending new messages.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  type Message,
} from '@/lib/messages/messages.service';
import { useAuthSession } from '@/hooks/use-auth-session';

const BG = '#FFFFFF';
const PRIMARY = '#3B6FD8';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const MESSAGE_BG = '#E7F1FF';
const RECEIVED_BG = '#F3F4F6';

interface AuthUser {
  id: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { receiver_id, receiver_name } = useLocalSearchParams<{
    receiver_id: string;
    receiver_name: string;
  }>();

  const { user, loading: authLoading } = useAuthSession() as { user: AuthUser | null; loading: boolean };

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ─── Load Messages ────────────────────────────────────────────────────────

  useEffect(() => {
    // Wait for auth to complete loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }

    if (!receiver_id) {
      setLoading(false);
      setError('No receiver specified');
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchMessages(user.id, receiver_id);

      if (fetchError) {
        setError(fetchError);
        setLoading(false);
        return;
      }

      setMessages(data || []);
      setLoading(false);
    };

    loadMessages();

    // Subscribe to real-time messages
    const channel = subscribeToMessages(user.id, receiver_id, (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, receiver_id, authLoading]);

  // ─── Handle Send Message ──────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !receiver_id) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    const { error: sendError } = await sendMessage({
      sender_id: user.id,
      receiver_id,
      content: textToSend,
    });

    setSending(false);

    if (sendError) {
      setError(sendError);
      setMessageText(textToSend); // Restore message on error
    }
  };

  // ─── Render Message Item ──────────────────────────────────────────────────

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        <View
          style={[
            styles.messageBubble,
            isOwn && styles.messageBubbleOwn,
          ]}
        >
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {new Date(item.sent_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  // ─── Render Empty State ────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptyText}>Start the conversation by sending a message.</Text>
    </View>
  );

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading || error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backButton}>‹ Back</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{receiver_name || 'Chat'}</Text>
            <View style={styles.headerSpacer} />
          </View>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
              <Pressable
                onPress={() => router.back()}
                style={{ marginTop: 12 }}
              >
                <Text style={[styles.errorBannerText, { color: PRIMARY, fontWeight: '600' }]}>
                  Go Back
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={{ marginTop: 12, color: TEXT_SECONDARY }}>
                Loading chat...
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render Screen ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{receiver_name || 'Chat'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Messages List */}
        <FlatList
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={messages.length === 0 ? styles.emptyListContent : undefined}
          onEndReachedThreshold={0.1}
        />

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={TEXT_SECONDARY}
            value={messageText}
            onChangeText={setMessageText}
            editable={!sending}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            <Text style={styles.sendButtonText}>{sending ? '…' : '›'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ─── Container ────────────────────────────────────────────────────────────

  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  // ─── Header ───────────────────────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    fontSize: 20,
    fontWeight: '600',
    color: PRIMARY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // ─── Messages ─────────────────────────────────────────────────────────────

  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: RECEIVED_BG,
  },
  messageBubbleOwn: {
    backgroundColor: MESSAGE_BG,
  },
  messageText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  messageTextOwn: {
    color: TEXT_PRIMARY,
  },
  messageTime: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: TEXT_SECONDARY,
  },

  // ─── Loading State ────────────────────────────────────────────────────────

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Empty State ──────────────────────────────────────────────────────────

  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // ─── Error Banner ─────────────────────────────────────────────────────────

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
  },

  // ─── Input Area ───────────────────────────────────────────────────────────

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
});
