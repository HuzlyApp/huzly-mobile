import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import MessageBubble from '@/components/ui/MessageBubble';
import MessageInput from '@/components/ui/MessageInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import BottomNav from '@/components/ui/BottomNav';

import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  type Message,
} from '@/lib/messages/messages.service';
import {
  uploadMessageAttachment,
  validateAttachment,
  ALLOWED_MIME_TYPES,
  type FileLike,
} from '@/lib/messages/attachments.service';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAgentUnresponsiveFallback } from '@/hooks/use-agent-unresponsive-fallback';
import SupportTicketCreateModal from '@/components/support/SupportTicketCreateModal';
import { getJsonItem, setJsonItem } from '@/stores/async-storage';
import {
  createSupportTicket,
  fetchWorkerTicketCategories,
  uploadSupportTicketAttachment,
} from '@/lib/support/support-tickets.service';
import {
  applyEscalationAfterUserMessage,
  createEscalationAccumulator,
  heuristicEmotionScores,
  isExplicitAgentRequest,
  mergeEmotionScores,
} from '@/lib/ai/agent-escalation';
import { analyzeUserEmotionForEscalation, getAIResponse } from '@/lib/ai/xai.service';
import { useMessageNotifications } from '@/contexts/MessageNotificationsContext';

const BG = '#FFFFFF';
const CHAT_BG = '#F8FAFC';
const PRIMARY = '#4473C0';
const TEAL = '#0D9488';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';
const RECEIVED_BG = '#ECF1F9';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sent_at: string;
  isAI?: boolean;
  attachments?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
  } | null;
}

const AI_SENDER_ID = '__ai_agent__';

function workerFirstName(u: User | null): string {
  if (!u) return 'there';
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof meta?.full_name === 'string'
      ? meta.full_name
      : typeof meta?.name === 'string'
        ? meta.name
        : '';
  const first = full.trim().split(/\s+/)[0];
  return first || 'there';
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    receiver_id: string;
    receiver_name: string;
  }>();
  const receiver_id = Array.isArray(params.receiver_id) ? params.receiver_id[0] : params.receiver_id;
  const receiver_name = Array.isArray(params.receiver_name) ? params.receiver_name[0] : params.receiver_name;

  const { user, loading: authLoading } = useAuthSession() as { user: User | null; loading: boolean };
  const { setActiveChatPartnerId, notifyConversationOpened } = useMessageNotifications();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'ai' | 'human'>('ai');
  const [chatStarted, setChatStarted] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileLike | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const aiTypingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const escalationAccRef = useRef(createEscalationAccumulator());
  const [agentEscalationButtonVisible, setAgentEscalationButtonVisible] = useState(false);

  const FALLBACK_MS = 20 * 1000;

  const {
    available: fallbackAvailable,
    secondsLeft,
    lastUserMessageAtIso,
  } = useAgentUnresponsiveFallback<ChatMessage>({
    enabled: chatMode === 'human' && !!user?.id,
    userId: user?.id ?? null,
    messages,
    inactivityMs: FALLBACK_MS,
  });

  const [ticketCreatedForContext, setTicketCreatedForContext] = useState<boolean | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketModalContextSentAtIso, setTicketModalContextSentAtIso] = useState<string | null>(null);
  const [ticketInitialSubject, setTicketInitialSubject] = useState('');
  const [ticketInitialDescription, setTicketInitialDescription] = useState('');
  const [ticketCategories, setTicketCategories] = useState<string[]>([]);
  const [ticketCategoriesLoading, setTicketCategoriesLoading] = useState(false);

  const ticketCreatedKey = useMemo(() => {
    if (!user?.id || !receiver_id || !lastUserMessageAtIso) return null;
    return `fallback_ticket_created:${user.id}:${receiver_id}:${lastUserMessageAtIso}`;
  }, [user?.id, receiver_id, lastUserMessageAtIso]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!ticketCreatedKey) {
        if (!cancelled) setTicketCreatedForContext(false);
        return;
      }

      const stored = await getJsonItem<{ ticketId: string }>(ticketCreatedKey);
      if (cancelled) return;
      setTicketCreatedForContext(!!stored?.ticketId);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [ticketCreatedKey]);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      if (!user?.id) return;
      setTicketCategoriesLoading(true);
      const { data, error } = await fetchWorkerTicketCategories();
      if (cancelled) return;
      if (error || !data) {
        setTicketCategories([]);
      } else {
        setTicketCategories(data);
      }
      setTicketCategoriesLoading(false);
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const displayPeerName = useMemo(() => {
    const n = receiver_name?.trim();
    if (n) return n;
    return 'Employer';
  }, [receiver_name]);

  const chatPartnerLabel = useMemo(() => {
    if (!receiver_id) return undefined;
    if (receiver_name) return `${receiver_name} (${receiver_id})`;
    return receiver_id;
  }, [receiver_id, receiver_name]);

  const peerInitial = useMemo(
    () => (displayPeerName.trim().charAt(0) || '?').toUpperCase(),
    [displayPeerName],
  );

  const showFallbackCard = chatMode === 'human' && fallbackAvailable && ticketCreatedForContext === false;

  const getLastUserMessage = () => {
    if (!user?.id) return null;
    let latest: ChatMessage | null = null;
    let latestMs = -Infinity;
    for (const m of messages) {
      if (m.sender_id !== user.id) continue;
      const ms = new Date(m.sent_at).getTime();
      if (!Number.isFinite(ms)) continue;
      if (ms > latestMs) {
        latestMs = ms;
        latest = m;
      }
    }
    return latest;
  };

  const buildChatHistoryForTicket = (maxItems = 10) => {
    if (!user?.id) return '';
    const slice = messages.slice(-maxItems);

    const formatMessage = (m: ChatMessage) => {
      const sender = m.sender_id === user.id ? 'You' : 'Agent/Other';
      const trimmed = (m.content ?? '').trim();
      const attachmentLabel = m.attachments?.fileName ? ` (attachment: ${m.attachments.fileName})` : '';
      const body = trimmed ? trimmed : attachmentLabel.trim() ? attachmentLabel.trim() : '[no text]';
      const at = m.sent_at ? new Date(m.sent_at).toISOString() : '';
      return `${sender} @ ${at}: ${body}`;
    };

    return slice.map(formatMessage).join('\n');
  };

  const handleCreateTicketPress = () => {
    if (!user?.id || !receiver_id || !lastUserMessageAtIso) return;
    if (ticketCreatedForContext !== false) return;

    const lastUserMsg = getLastUserMessage();
    if (!lastUserMsg) return;

    const subject = 'Support request (Chat)';
    const history = buildChatHistoryForTicket(10);
    const defaultDescription = [
      `User ID: ${user.id}`,
      chatPartnerLabel ? `Chat partner: ${chatPartnerLabel}` : `Chat partner ID: ${receiver_id}`,
      '',
      'Last conversation messages (for context):',
      history || '-',
      '',
      'Message from you:',
      (lastUserMsg.content ?? '').trim() || '[attachment(s)]',
      '',
      'What help do you need?',
    ].join('\n');

    setTicketModalContextSentAtIso(lastUserMessageAtIso);
    setTicketInitialSubject(subject);
    setTicketInitialDescription(defaultDescription);
    setTicketModalVisible(true);
  };

  const handleSubmitTicket = async (
    input: { subject: string; category: string; description: string; file: FileLike | null },
  ) => {
    if (!user?.id || !receiver_id || !ticketModalContextSentAtIso) return;

    const submittedAt = new Date().toISOString();
    let attachmentSection = '';

    if (input.file) {
      const { data: uploadedAttachment, error: uploadError } = await uploadSupportTicketAttachment(input.file, user.id);
      if (uploadError || !uploadedAttachment) {
        throw new Error(uploadError ?? 'Failed to upload ticket attachment.');
      }

      attachmentSection = [
        '',
        'Attachment:',
        `Name: ${uploadedAttachment.fileName}`,
        `Type: ${uploadedAttachment.fileType}`,
        `Size: ${uploadedAttachment.fileSize} bytes`,
        `URL: ${uploadedAttachment.fileUrl}`,
      ].join('\n');
    }

    const finalDescription = `${input.description}${attachmentSection}\n\nSubmitted at: ${submittedAt}\nUser ID: ${user.id}`;

    const { data: ticket, error } = await createSupportTicket({
      userId: user.id,
      subject: input.subject,
      category: input.category,
      description: finalDescription,
    });

    if (error || !ticket) {
      throw new Error(error ?? 'Failed to create ticket.');
    }

    await setJsonItem(`fallback_ticket_created:${user.id}:${receiver_id}:${ticketModalContextSentAtIso}`, {
      ticketId: ticket.id,
    });

    setTicketModalVisible(false);
    setTicketCreatedForContext(true);

    router.replace({ pathname: '/support/success', params: { id: ticket.id } } as any);
  };

  // Ensure we never leave a running typing interval after unmount.
  useEffect(() => {
    return () => {
      if (aiTypingIntervalRef.current) {
        clearInterval(aiTypingIntervalRef.current);
        aiTypingIntervalRef.current = null;
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!receiver_id) return;
      setActiveChatPartnerId(receiver_id);
      void notifyConversationOpened(receiver_id);
      return () => setActiveChatPartnerId(null);
    }, [receiver_id, setActiveChatPartnerId, notifyConversationOpened]),
  );

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

      const msgs = (data || []).map((m: Message) => ({ ...m, isAI: false }));
      setMessages(msgs);
      if (msgs.length > 0) {
        setChatStarted(true);
      }
      setLoading(false);
    };

    loadMessages();

    const channel = subscribeToMessages(user.id, receiver_id, (newMessage: Message) => {
      setMessages((prev) => [...prev, { ...newMessage, isAI: false }]);
      setChatStarted(true);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, receiver_id, authLoading]);

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleGetStarted = () => {
    setChatStarted(true);
    const fn = workerFirstName(user);
    const introMessages: ChatMessage[] = [
      {
        id: `ai-intro-1-${Date.now()}`,
        content: `Hi, ${fn}! You're connected with ${displayPeerName}. Send a message below whenever you're ready.`,
        sender_id: AI_SENDER_ID,
        receiver_id: user?.id || '',
        sent_at: new Date().toISOString(),
        isAI: true,
      },
    ];
    setMessages(introMessages);
    scrollToEnd();
  };

  const handleAttachPress = async () => {
    try {
      const mimeTypes = Platform.OS === 'web'
        ? ['image/*', 'application/pdf', '.docx', '.xlsx']
        : [...ALLOWED_MIME_TYPES];

      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const file: FileLike = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      };

      const validationError = validateAttachment(file);
      if (validationError) {
        Alert.alert('Cannot attach file', validationError);
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
    } catch (err) {
      console.warn('Document picker error:', err);
    }
  };

  const handleClearAttachment = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleSendMessage = async () => {
    if (!user || !receiver_id) return;
    if (!messageText.trim() && !selectedFile) return;

    const textToSend = messageText.trim();
    const fileToSend = selectedFile;
    setMessageText('');
    setSelectedFile(null);
    setSending(true);
    setSendError(null);
    setUploadError(null);

    let attachment = null;

    if (fileToSend) {
      setUploading(true);
      const { attachment: uploaded, error: upErr } = await uploadMessageAttachment(fileToSend, user.id);
      setUploading(false);

      if (upErr) {
        setUploadError(upErr);
        setSending(false);
        setSelectedFile(fileToSend);
        return;
      }

      attachment = uploaded;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: textToSend,
      sender_id: user.id,
      receiver_id: receiver_id,
      sent_at: new Date().toISOString(),
      isAI: false,
      ...(attachment ? { attachments: attachment } : {}),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToEnd();

    if (chatMode === 'ai') {
      const aiPrompt = attachment
        ? `${textToSend} [User attached a file: ${attachment.fileName}]`
        : textToSend;

      const typingMessageId = `ai-typing-${Date.now()}`;
      const typingMsg: ChatMessage = {
        id: typingMessageId,
        content: '',
        sender_id: AI_SENDER_ID,
        receiver_id: user.id,
        sent_at: new Date().toISOString(),
        isAI: true,
      };

      // Insert placeholder bubble immediately, then animate when the reply arrives.
      setMessages((prev) => [...prev, typingMsg]);
      scrollToEnd();

      setAiTyping(true);

      const processEmotionForEscalation = async () => {
        if (!textToSend.trim()) return;
        const heur = heuristicEmotionScores(textToSend);
        const api = await analyzeUserEmotionForEscalation(textToSend);
        const merged = mergeEmotionScores(
          heur,
          api ? { frustration: api.frustration, anger: api.anger } : null,
        );
        const explicitBlocked =
          isExplicitAgentRequest(textToSend) || (api?.explicit_human_request ?? false);
        const acc = escalationAccRef.current;
        const prevVisible = acc.buttonVisible;
        applyEscalationAfterUserMessage(acc, merged, explicitBlocked);
        if (acc.buttonVisible !== prevVisible) {
          setAgentEscalationButtonVisible(acc.buttonVisible);
        }
      };

      await Promise.all([new Promise((resolve) => setTimeout(resolve, 1500)), processEmotionForEscalation()]);
      const { reply, error: aiError } = await getAIResponse(aiPrompt || 'User sent a file');
      setAiTyping(false);

      if (reply) {
        if (aiTypingIntervalRef.current) {
          clearInterval(aiTypingIntervalRef.current);
          aiTypingIntervalRef.current = null;
        }

        const fullText = reply;
        const totalLen = fullText.length;
        const step = totalLen < 180 ? 1 : 2;
        const intervalMs = 18;

        let index = 0;

        const firstChunk = totalLen > 0 ? fullText.slice(0, 1) : '';
        setMessages((prev) =>
          prev.map((m) => (m.id === typingMessageId ? { ...m, content: firstChunk } : m)),
        );
        index = totalLen > 0 ? 1 : 0;

        if (totalLen === 0) {
          setMessages((prev) => prev.filter((m) => m.id !== typingMessageId));
          return;
        }

        aiTypingIntervalRef.current = setInterval(() => {
          index = Math.min(totalLen, index + step);
          const nextText = fullText.slice(0, index);

          setMessages((prev) =>
            prev.map((m) => (m.id === typingMessageId ? { ...m, content: nextText } : m)),
          );

          if (index >= totalLen) {
            if (aiTypingIntervalRef.current) {
              clearInterval(aiTypingIntervalRef.current);
              aiTypingIntervalRef.current = null;
            }
          }
        }, intervalMs);
      } else if (aiError) {
        setSendError(aiError);
        setMessages((prev) => prev.filter((m) => m.id !== typingMessageId));
      }
    } else {
      const { error: msgSendError } = await sendMessage({
        sender_id: user.id,
        receiver_id,
        content: textToSend,
        ...(attachment ? { attachments: attachment } : {}),
      });

      if (msgSendError) {
        setSendError(msgSendError);
        setMessageText(textToSend);
      }
    }

    setSending(false);
  };

  const handleChatWithAgent = async () => {
    if (!user) return;

    setChatMode('human');

    await createSupportTicket({
      userId: user.id,
      subject: 'Live Support Request',
      description:
        'Escalated from AI chat after frustration/anger signals met threshold (emotion-based routing; not a manual agent request).',
    });

    const systemMsg: ChatMessage = {
      id: `system-${Date.now()}`,
      content: "You're now connected with a live agent. They'll reply here shortly.",
      sender_id: AI_SENDER_ID,
      receiver_id: user.id,
      sent_at: new Date().toISOString(),
      isAI: true,
    };
    setMessages((prev) => [...prev, systemMsg]);
    scrollToEnd();
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender_id === user?.id;
    return (
      <MessageBubble
        message={item as Message}
        isOwn={isOwn}
        isAI={item.isAI}
        peerLabel={displayPeerName}
      />
    );
  };

  const welcomeFirstName = workerFirstName(user);

  const renderGetStarted = () => (
    <View style={styles.preChatWrap}>
      <View style={styles.aiIntroRow}>
        <View style={styles.aiAvatarSmall}>
          <Text style={styles.aiAvatarLetter}>{peerInitial}</Text>
        </View>
        <View style={styles.aiIntroBubble}>
          <Text style={styles.aiIntroText}>
            Hi, {welcomeFirstName}! Thanks for your message. Please let us know how we can help? When you're ready, tap
            "Get Started" below to begin.
          </Text>
          <Text style={styles.aiIntroMeta}>
            {displayPeerName} •{' '}
            {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.getStartedFab, pressed && { opacity: 0.88 }]}
        onPress={handleGetStarted}
      >
        <Text style={styles.getStartedFabText}>Get Started</Text>
      </Pressable>
    </View>
  );

  const onHeaderPhonePress = () => {
    Alert.alert('Call employer', 'A phone number for this employer is not available in the app yet.');
  };

  if (loading || loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
              <Ionicons name="chevron-back" size={22} color={PRIMARY} />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarLetter}>{peerInitial}</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {displayPeerName}
              </Text>
            </View>
            <Pressable style={styles.headerRightBtn} onPress={onHeaderPhonePress} accessibilityLabel="Call employer">
              <Ionicons name="call-outline" size={20} color={TEXT_SECONDARY} />
            </Pressable>
          </View>
          {loadError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{loadError}</Text>
              <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
                <Text style={[styles.errorBannerText, { color: PRIMARY, fontWeight: '600' }]}>Go Back</Text>
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
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={22} color={PRIMARY} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarLetter}>{peerInitial}</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayPeerName}
            </Text>
          </View>
          <Pressable style={styles.headerRightBtn} onPress={onHeaderPhonePress} accessibilityLabel="Call employer">
            <Ionicons name="call-outline" size={20} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        {!chatStarted && messages.length === 0 ? (
          <View style={styles.preChatRoot}>
            {renderGetStarted()}
            <BottomNav active="message" />
          </View>
        ) : (
          <>
            {sendError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{sendError}</Text>
              </View>
            ) : null}

            {chatStarted ? (
              <View style={styles.threadPills}>
                <View style={styles.threadPill}>
                  <Text style={styles.threadPillText}>Chat with Employer</Text>
                </View>
                {chatMode === 'human' ? (
                  <View style={styles.threadPill}>
                    <Text style={styles.threadPillText}>You are now talking to Agent</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <FlatList
              ref={flatListRef}
              style={styles.messageList}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messageListContent}
              onContentSizeChange={() => scrollToEnd()}
            />

            {aiTyping && (
              <View style={styles.typingRow}>
                <View style={styles.aiAvatarSmall}>
                  <Ionicons name="person" size={14} color="#FFFFFF" />
                </View>
                <TypingIndicator />
              </View>
            )}

            {chatMode === 'ai' && agentEscalationButtonVisible ? (
              <View style={styles.chatWithAgentBlock}>
                <Pressable
                  style={({ pressed }) => [styles.chatWithAgentBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleChatWithAgent}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={PRIMARY} />
                  <Text style={styles.chatWithAgentText}>Chat with Agent</Text>
                </Pressable>
                <Text style={styles.chatWithAgentHint}>Need more help? Talk to support.</Text>
              </View>
            ) : null}

            {chatMode === 'human' && secondsLeft !== null && !fallbackAvailable && ticketCreatedForContext !== true ? (
              <View style={styles.fallbackCountdownRow}>
                <Text style={styles.fallbackCountdownText}>
                  Agent will respond shortly... {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </Text>
              </View>
            ) : null}

            {showFallbackCard ? (
              <View style={styles.fallbackCard}>
                <Text style={styles.fallbackTitle}>It looks like no agent is available right now.</Text>
                <Text style={styles.fallbackBody}>Would you like to create a support ticket?</Text>

                <Pressable
                  style={({ pressed }) => [styles.fallbackButton, pressed && { opacity: 0.9 }]}
                  onPress={handleCreateTicketPress}
                >
                  <Text style={styles.fallbackButtonText}>Create Ticket</Text>
                </Pressable>
              </View>
            ) : null}

            <MessageInput
              variant="employer"
              value={messageText}
              onChangeText={setMessageText}
              onSend={handleSendMessage}
              sending={sending}
              onAttachPress={handleAttachPress}
              selectedFile={selectedFile ? { name: selectedFile.name, size: selectedFile.size, mimeType: selectedFile.mimeType } : null}
              onClearAttachment={handleClearAttachment}
              uploading={uploading}
              uploadError={uploadError}
            />

            <SupportTicketCreateModal
              visible={ticketModalVisible}
              onClose={() => setTicketModalVisible(false)}
              onSubmit={handleSubmitTicket}
              userId={user?.id ?? ''}
              chatPartnerLabel={chatPartnerLabel}
              defaultSubject={ticketInitialSubject}
              categories={ticketCategories}
              categoriesLoading={ticketCategoriesLoading}
              defaultDescription={ticketInitialDescription}
            />

            <BottomNav active="message" />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: CHAT_BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBackBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    maxWidth: '62%',
  },
  headerRightBtn: {
    padding: 6,
  },

  preChatRoot: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  preChatWrap: {
    flex: 1,
    backgroundColor: CHAT_BG,
    paddingTop: 8,
  },
  getStartedFab: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedFabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  threadPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: CHAT_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  threadPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  threadPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  messageList: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  messageListContent: {
    paddingVertical: 12,
    paddingBottom: 4,
  },

  aiIntroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  aiIntroBubble: {
    backgroundColor: RECEIVED_BG,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  aiIntroText: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_PRIMARY,
  },
  aiIntroMeta: {
    marginTop: 6,
    fontSize: 11,
    color: '#94A3B8',
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  typingBubble: {
    backgroundColor: RECEIVED_BG,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingDots: {
    fontSize: 18,
    color: '#94A3B8',
    letterSpacing: 2,
  },

  chatWithAgentBlock: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chatWithAgentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: BG,
    gap: 6,
  },
  chatWithAgentText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY,
  },
  chatWithAgentHint: {
    marginTop: 4,
    fontSize: 11,
    color: TEXT_SECONDARY,
    paddingLeft: 2,
  },

  fallbackCountdownRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFC',
  },
  fallbackCountdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  fallbackCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  fallbackBody: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    lineHeight: 16,
  },
  fallbackButton: {
    marginTop: 4,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
