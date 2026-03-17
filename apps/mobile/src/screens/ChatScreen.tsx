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
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MessageBubble from '@/components/ui/MessageBubble';
import MessageInput from '@/components/ui/MessageInput';
import BottomNav from '@/components/ui/BottomNav';
import ChatHeader from '@/components/ui/ChatHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  type Message,
} from '@/lib/messages/messages.service';
import {
  uploadMessageAttachment,
  validateAttachment,
  type FileLike,
} from '@/lib/messages/attachments.service';
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

  const [selectedFile, setSelectedFile] = useState<FileLike | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // ─── Attachments ───────────────────────────────────────────────────────────

  const handlePickAttachment = async () => {
    setUploadError(null);

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
      ],
    });

    if (result.canceled) return;

    const file = result.assets[0];

    const fileLike: FileLike = {
      uri: file.uri,
      name: file.name ?? 'attachment',
      mimeType: file.mimeType ?? 'application/octet-stream',
      size: file.size ?? 0,
    };

    const validationError = validateAttachment(fileLike);
    if (validationError) {
      setUploadError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(fileLike);
  };

  const handleClearAttachment = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  // ─── Handle Send Message ──────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!user || !receiver_id) return;
    if (!messageText.trim() && !selectedFile) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);
    setUploadError(null);

    let attachment = null;

    if (selectedFile) {
      setUploading(true);
      const { attachment: uploaded, error: uploadErr } = await uploadMessageAttachment(
        selectedFile,
        user.id,
      );
      setUploading(false);

      if (uploadErr || !uploaded) {
        setUploadError(uploadErr ?? 'Failed to upload file.');
        setSending(false);
        setMessageText(textToSend);
        return;
      }

      attachment = uploaded;
    }

    const { error: sendError } = await sendMessage({
      sender_id: user.id,
      receiver_id,
      content: textToSend,
      attachments: attachment,
    });

    setSending(false);
    setSelectedFile(null);

    if (sendError) {
      setError(sendError);
      setMessageText(textToSend);
    }
  };

  // ─── Render Message Item ──────────────────────────────────────────────────

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;

    return <MessageBubble message={item} isOwn={isOwn} />;
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
          <ChatHeader title={receiver_name || 'Chat'} onBack={() => router.back()} onRight={() => {}} />
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
        <ChatHeader title={receiver_name || 'Chat'} onBack={() => router.back()} onRight={() => {}} />

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
        <MessageInput
          value={messageText}
          onChangeText={setMessageText}
          onSend={handleSendMessage}
          sending={sending}
          onAttachPress={handlePickAttachment}
          selectedFile={
            selectedFile
              ? {
                  name: selectedFile.name,
                  size: selectedFile.size,
                  mimeType: selectedFile.mimeType,
                }
              : undefined
          }
          onClearAttachment={handleClearAttachment}
          uploading={uploading}
          uploadError={uploadError}
        />

        {/* Bottom Navigation (visual) */}
        <BottomNav />
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
