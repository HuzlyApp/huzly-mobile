import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { createSupportTicket } from '@/lib/support/support-tickets.service';
import { getAIResponse } from '@/lib/ai/xai.service';

const BG = '#FFFFFF';
const CHAT_BG = '#FFFFFF';
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

interface AuthUser {
  id: string;
}

const AI_SENDER_ID = '__ai_agent__';

export default function ChatScreen() {
  const router = useRouter();
  const { receiver_id, receiver_name } = useLocalSearchParams<{
    receiver_id: string;
    receiver_name: string;
  }>();

  const { user, loading: authLoading } = useAuthSession() as { user: AuthUser | null; loading: boolean };

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

  // Ensure we never leave a running typing interval after unmount.
  useEffect(() => {
    return () => {
      if (aiTypingIntervalRef.current) {
        clearInterval(aiTypingIntervalRef.current);
        aiTypingIntervalRef.current = null;
      }
    };
  }, []);

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
    const introMessages: ChatMessage[] = [
      {
        id: `ai-intro-1-${Date.now()}`,
        content: `Hi, ${user?.id ? 'John' : 'there'}! We're happy to help. When you're ready, click "Get Started" below to begin.`,
        sender_id: AI_SENDER_ID,
        receiver_id: user?.id || '',
        sent_at: new Date().toISOString(),
        isAI: true,
      },
      {
        id: `ai-intro-2-${Date.now()}`,
        content: 'Please provide as much information as you can–such as the pro\'s name, shift date/time, shift position, and invoice amount–so we can look into your inquiry. Thank you!',
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
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
      description: 'User requested human agent',
    });

    const systemMsg: ChatMessage = {
      id: `system-${Date.now()}`,
      content: 'You have been connected to a live agent. Please wait for a response.',
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
      />
    );
  };

  const renderGetStarted = () => (
    <View style={styles.getStartedContainer}>
      <Text style={styles.helpPrompt}>Have a question? Send us a message</Text>

      <View style={styles.aiIntroRow}>
        <View style={styles.aiAvatarSmall}>
          <Ionicons name="person" size={14} color="#FFFFFF" />
        </View>
        <View style={styles.aiIntroBubble}>
          <Text style={styles.aiIntroText}>
            Hi, John! We're happy to help. When you're ready, click "Get Started" below to begin.
          </Text>
          <Text style={styles.aiIntroMeta}>AI Agent • Just now</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.getStartedBtn, pressed && { opacity: 0.85 }]}
        onPress={handleGetStarted}
      >
        <Text style={styles.getStartedBtnText}>Get Started</Text>
      </Pressable>
    </View>
  );

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
                <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>Chat Support</Text>
            </View>
            <Pressable style={styles.headerRightBtn}>
              <Ionicons name="chatbubble-outline" size={20} color={TEXT_SECONDARY} />
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
              <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Chat Support</Text>
          </View>
          <Pressable style={styles.headerRightBtn}>
            <Ionicons name="chatbubble-outline" size={20} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        {!chatStarted && messages.length === 0 ? (
          <>
            {renderGetStarted()}
            <View style={{ flex: 1 }} />
            <BottomNav active="message" />
          </>
        ) : (
          <>
            {sendError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{sendError}</Text>
              </View>
            ) : null}

            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 12 }}
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

            {chatMode === 'ai' && (
              <Pressable
                style={({ pressed }) => [styles.chatWithAgentBtn, pressed && { opacity: 0.85 }]}
                onPress={handleChatWithAgent}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={PRIMARY} />
                <Text style={styles.chatWithAgentText}>Chat with Agent</Text>
              </Pressable>
            )}

            <MessageInput
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerRightBtn: {
    padding: 6,
  },

  helpPrompt: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
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
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
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

  getStartedContainer: {
    paddingTop: 4,
  },
  getStartedBtn: {
    marginHorizontal: 16,
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

  chatWithAgentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
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
