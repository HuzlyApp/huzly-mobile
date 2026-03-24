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
const PRIMARY = '#0D9488';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';
const MODAL_OVERLAY = 'rgba(15, 23, 42, 0.45)';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);

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

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setLoading(false);
      setLoadError('User not authenticated');
      return;
    }

    if (!receiver_id) {
      setLoading(false);
      setLoadError('No receiver specified');
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error: fetchError } = await fetchMessages(user.id, receiver_id);

      if (fetchError) {
        setLoadError(fetchError);
        setLoading(false);
        return;
      }

      const msgs = data || [];
      setMessages(msgs);
      if (msgs.length > 0) {
        setChatStarted(true);
      }
      setLoading(false);
    };

    loadMessages();

    const channel = subscribeToMessages(user.id, receiver_id, (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
      setChatStarted(true);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, receiver_id, authLoading]);

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

  const handleGetStarted = () => {
    setChatStarted(true);
  };

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

    const { error: msgSendError } = await sendMessage({
      sender_id: user.id,
      receiver_id,
      content: textToSend,
      attachments: attachment,
    });

    setSending(false);
    setSelectedFile(null);

    if (msgSendError) {
      setSendError(msgSendError);
      setMessageText(textToSend);
    } else {
      setSendError(null);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;
    return <MessageBubble message={item} isOwn={isOwn} />;
  };

  const renderGetStarted = () => (
    <View style={styles.getStartedContainer}>
      <View style={styles.getStartedCard}>
        <Text style={styles.getStartedCompany}>{receiver_name || 'Employer'}</Text>
        <Text style={styles.getStartedText}>
          Hi! Thanks for your message. Please let us know how we can help. When you're ready, click "Get Started" below to begin.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.chatWithEmployerBtn, pressed && { opacity: 0.85 }]}
        onPress={handleGetStarted}
      >
        <Text style={styles.chatWithEmployerText}>Chat with Employer</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.getStartedBtn, pressed && { opacity: 0.85 }]}
        onPress={handleGetStarted}
      >
        <Text style={styles.getStartedBtnText}>Get Started</Text>
      </Pressable>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptyText}>Start the conversation by sending a message.</Text>
    </View>
  );

  if (loading || loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <ChatHeader title={receiver_name || 'Chat'} onBack={() => router.back()} onRight={() => {}} />
          {loadError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{loadError}</Text>
              <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
                <Text style={[styles.errorBannerText, { color: PRIMARY, fontWeight: '600' as const }]}>Go Back</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={{ marginTop: 12, color: TEXT_SECONDARY }}>Loading chat...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ChatHeader title={receiver_name || 'Chat'} onBack={() => router.back()} onRight={() => {}} />

        {!chatStarted && messages.length === 0 ? (
          <>
            {renderGetStarted()}
            <View style={{ flex: 1 }} />
            <BottomNav />
          </>
        ) : (
          <>
            <View style={styles.quickActions}>
              <Pressable
                style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.85 }]}
                onPress={handleOpenTicketModal}
              >
                <Text style={styles.quickActionText}>Create Ticket</Text>
              </Pressable>
            </View>

            {sendError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{sendError}</Text>
              </View>
            ) : null}

            <FlatList
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={messages.length === 0 ? styles.emptyListContent : { paddingVertical: 12 }}
              onEndReachedThreshold={0.1}
            />

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

            <BottomNav />
          </>
        )}
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
                    placeholderTextColor="#94A3B8"
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
                    placeholderTextColor="#94A3B8"
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
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: 'flex-end',
  },
  quickActionBtn: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  quickActionText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },

  getStartedContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  getStartedCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  getStartedCompany: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  getStartedText: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
  chatWithEmployerBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  chatWithEmployerText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  getStartedBtn: {
    width: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  getStartedBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: MODAL_OVERLAY,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  formField: {
    marginBottom: 14,
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
    marginTop: 8,
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
