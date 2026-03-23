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
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { createSupportTicket } from '@/lib/support/support-tickets.service';

const BG = '#FFFFFF';
const PRIMARY = '#3B6FD8';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const MESSAGE_BG = '#E7F1FF';
const RECEIVED_BG = '#F3F4F6';
const MODAL_OVERLAY = 'rgba(17, 24, 39, 0.45)';

const createTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Topic / Subject is required'),
  description: z.string().trim().min(1, 'Message / Description is required'),
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

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
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketSubmitError, setTicketSubmitError] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
    },
  });

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

  const handleOpenTicketModal = () => {
    setTicketSubmitError(null);
    setTicketModalVisible(true);
  };

  const handleCloseTicketModal = () => {
    setTicketModalVisible(false);
    setTicketSubmitError(null);
    reset();
  };

  const onSubmitTicket = async (values: CreateTicketFormValues) => {
    if (!user) return;

    setSubmittingTicket(true);
    setTicketSubmitError(null);

    const { data, error: createError } = await createSupportTicket({
      userId: user.id,
      subject: values.subject.trim(),
      description: values.description.trim(),
    });

    setSubmittingTicket(false);

    if (createError || !data) {
      setTicketSubmitError(createError ?? 'Failed to submit ticket.');
      return;
    }

    handleCloseTicketModal();
    router.push(`/support/ticket/${data.id}`);
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

        <View style={styles.ticketCtaContainer}>
          <Pressable
            style={({ pressed }) => [styles.ticketCtaButton, pressed && styles.ticketCtaButtonPressed]}
            onPress={handleOpenTicketModal}
          >
            <Text style={styles.ticketCtaButtonText}>Create Ticket</Text>
          </Pressable>
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

      <Modal
        visible={ticketModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseTicketModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Support Ticket</Text>
            <Text style={styles.modalSubtitle}>Tell us what you need help with.</Text>

            <Controller
              control={control}
              name="subject"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Topic / Subject</Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={[styles.formInput, errors.subject ? styles.formInputError : null]}
                    placeholder="Brief summary of your issue"
                    placeholderTextColor="#9CA3AF"
                  />
                  {errors.subject ? <Text style={styles.errorTextInline}>{errors.subject.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Message / Description</Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={[styles.formInput, styles.formTextarea, errors.description ? styles.formInputError : null]}
                    placeholder="Describe your request in detail"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                  />
                  {errors.description ? (
                    <Text style={styles.errorTextInline}>{errors.description.message}</Text>
                  ) : null}
                </View>
              )}
            />

            {ticketSubmitError ? <Text style={styles.errorBannerText}>{ticketSubmitError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryBtn} onPress={handleCloseTicketModal}>
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  pressed && styles.modalPrimaryBtnPressed,
                  submittingTicket && styles.modalPrimaryBtnDisabled,
                ]}
                onPress={handleSubmit(onSubmitTicket)}
                disabled={submittingTicket}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ─── Container ────────────────────────────────────────────────────────────

  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  ticketCtaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: 'flex-end',
  },
  ticketCtaButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ticketCtaButtonPressed: {
    opacity: 0.8,
  },
  ticketCtaButtonText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },

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
  errorTextInline: {
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: MODAL_OVERLAY,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },
  formTextarea: {
    minHeight: 110,
  },
  formInputError: {
    borderColor: '#EF4444',
  },
  modalActions: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSecondaryBtnText: {
    color: TEXT_SECONDARY,
    fontWeight: '600',
    fontSize: 13,
  },
  modalPrimaryBtn: {
    borderRadius: 10,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalPrimaryBtnPressed: {
    opacity: 0.9,
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.7,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
