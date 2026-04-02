import * as Haptics from 'expo-haptics';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import {
  fetchUnreadCountsBySender,
  markConversationAsRead,
  subscribeToIncomingMessages,
  type Message,
} from '@/lib/messages/messages.service';
import {
  isNotificationAudioGestureUnlocked,
  markNotificationAudioUnlockedFromUserGesture,
  playMessageNotificationSound,
} from '@/lib/notifications/notification-sound';
import { STORAGE_KEYS } from '@/stores/keys';
import { getItem, setItem } from '@/stores/async-storage';

export type MessageNotificationPreferences = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  browserNotificationsEnabled: boolean;
};

type QueuedToast = {
  id: string;
  senderId: string;
  title: string;
  body: string;
};

type MessageNotificationsContextValue = {
  totalUnread: number;
  unreadBySenderId: Record<string, number>;
  preferences: MessageNotificationPreferences;
  setSoundEnabled: (value: boolean) => void;
  setVibrationEnabled: (value: boolean) => void;
  setBrowserNotificationsEnabled: (value: boolean) => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  setActiveChatPartnerId: (partnerId: string | null) => void;
  notifyConversationOpened: (partnerId: string) => Promise<void>;
};

const MessageNotificationsContext = createContext<MessageNotificationsContextValue | null>(null);

const TOAST_MS = 4200;
const MAX_NOTIFIED_IDS = 400;

function messageKind(_msg: Message): 'user' | 'system' {
  return 'user';
}

function isDocumentHidden(): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  return document.hidden;
}

function triggerMessageVibration(enabled: boolean) {
  if (!enabled) return;
  try {
    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(140);
    }
  } catch {
    // ignore
  }
}

export function MessageNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthSession();
  const userId = user?.id ?? null;

  const [preferences, setPreferences] = useState<MessageNotificationPreferences>({
    soundEnabled: true,
    vibrationEnabled: true,
    browserNotificationsEnabled: false,
  });
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const [unreadBySenderId, setUnreadBySenderId] = useState<Record<string, number>>({});
  const [toastQueue, setToastQueue] = useState<QueuedToast[]>([]);
  const [visibleToast, setVisibleToast] = useState<QueuedToast | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastSlide = useRef(new Animated.Value(-24)).current;

  const activeChatPartnerIdRef = useRef<string | null>(null);
  const notifiedIdsRef = useRef<string[]>([]);

  const rememberNotifiedId = useCallback((id: string) => {
    const arr = notifiedIdsRef.current;
    arr.push(id);
    while (arr.length > MAX_NOTIFIED_IDS) {
      arr.shift();
    }
  }, []);

  const persistPreference = useCallback(async (key: string, value: boolean) => {
    await setItem(key, value ? '1' : '0');
  }, []);

  const setSoundEnabled = useCallback(
    (value: boolean) => {
      setPreferences((p) => ({ ...p, soundEnabled: value }));
      void persistPreference(STORAGE_KEYS.messageNotifSound, value);
    },
    [persistPreference],
  );

  const setVibrationEnabled = useCallback(
    (value: boolean) => {
      setPreferences((p) => ({ ...p, vibrationEnabled: value }));
      void persistPreference(STORAGE_KEYS.messageNotifVibration, value);
    },
    [persistPreference],
  );

  const setBrowserNotificationsEnabled = useCallback(
    async (value: boolean) => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (value && Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            setPreferences((p) => ({ ...p, browserNotificationsEnabled: false }));
            await setItem(STORAGE_KEYS.messageNotifBrowser, '0');
            return;
          }
        }
        if (value && Notification.permission !== 'granted') {
          setPreferences((p) => ({ ...p, browserNotificationsEnabled: false }));
          await setItem(STORAGE_KEYS.messageNotifBrowser, '0');
          return;
        }
      }
      setPreferences((p) => ({ ...p, browserNotificationsEnabled: value }));
      await persistPreference(STORAGE_KEYS.messageNotifBrowser, value);
    },
    [persistPreference],
  );

  const refreshUnreadCounts = useCallback(async () => {
    if (!userId) {
      setUnreadBySenderId({});
      return;
    }
    const { data, error } = await fetchUnreadCountsBySender(userId);
    if (error || !data) return;
    setUnreadBySenderId(data);
  }, [userId]);

  const setActiveChatPartnerId = useCallback((partnerId: string | null) => {
    activeChatPartnerIdRef.current = partnerId;
  }, []);

  const notifyConversationOpened = useCallback(
    async (partnerId: string) => {
      if (!userId) return;
      await markConversationAsRead(userId, partnerId);
      setUnreadBySenderId((prev) => {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
    },
    [userId],
  );

  const showBrowserNotification = useCallback((title: string, body: string, messageId: string) => {
    const prefs = preferencesRef.current;
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    if (!prefs.browserNotificationsEnabled || Notification.permission !== 'granted') {
      return;
    }
    if (!isDocumentHidden()) return;
    try {
      const n = new Notification(title, { body, tag: `msg-${messageId}`, requireInteraction: false });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // ignore
    }
  }, []);

  const enqueueToast = useCallback((item: QueuedToast) => {
    setToastQueue((q) => [...q, item]);
  }, []);

  useEffect(() => {
    if (visibleToast !== null) return;
    setToastQueue((q) => {
      if (q.length === 0) return q;
      const [next, ...rest] = q;
      setVisibleToast(next);
      return rest;
    });
  }, [visibleToast, toastQueue.length]);

  useEffect(() => {
    if (!visibleToast) return;
    toastOpacity.setValue(0);
    toastSlide.setValue(-20);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(toastSlide, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(toastSlide, { toValue: -16, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setVisibleToast(null);
        }
      });
    }, TOAST_MS);

    return () => clearTimeout(hideTimer);
  }, [visibleToast, toastOpacity, toastSlide]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [s, v, b] = await Promise.all([
        getItem(STORAGE_KEYS.messageNotifSound),
        getItem(STORAGE_KEYS.messageNotifVibration),
        getItem(STORAGE_KEYS.messageNotifBrowser),
      ]);
      if (cancelled) return;
      setPreferences({
        soundEnabled: s !== '0',
        vibrationEnabled: v !== '0',
        browserNotificationsEnabled:
          b === '1' &&
          (Platform.OS !== 'web' ||
            (typeof Notification !== 'undefined' && Notification.permission === 'granted')),
      });
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !userId) {
      setUnreadBySenderId({});
      notifiedIdsRef.current = [];
      return;
    }
    void refreshUnreadCounts();
  }, [authLoading, userId, refreshUnreadCounts]);

  useEffect(() => {
    if (!userId || authLoading) return;

    const channel = subscribeToIncomingMessages(userId, (msg: Message) => {
      if (!msg?.id) return;
      if (notifiedIdsRef.current.includes(msg.id)) return;
      rememberNotifiedId(msg.id);

      const senderId = msg.sender_id;
      const prefs = preferencesRef.current;

      const viewingThisChat = activeChatPartnerIdRef.current === senderId;
      if (viewingThisChat) {
        void markConversationAsRead(userId, senderId);
        return;
      }

      setUnreadBySenderId((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));

      const preview = (msg.content ?? '').trim() || (msg.attachments ? 'Attachment' : 'New message');
      const kind = messageKind(msg);
      void playMessageNotificationSound({ enabled: prefs.soundEnabled, kind });
      triggerMessageVibration(prefs.vibrationEnabled);

      showBrowserNotification('New message', preview, msg.id);

      enqueueToast({
        id: msg.id,
        senderId,
        title: 'New message',
        body: preview.length > 120 ? `${preview.slice(0, 117)}…` : preview,
      });
    });

    return () => {
      void channel.unsubscribe();
    };
  }, [authLoading, userId, rememberNotifiedId, enqueueToast, showBrowserNotification]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && userId) {
        void refreshUnreadCounts();
      }
    });
    return () => sub.remove();
  }, [userId, refreshUnreadCounts]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onVis = () => {
      if (!document.hidden && userId) {
        void refreshUnreadCounts();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userId, refreshUnreadCounts]);

  const totalUnread = useMemo(
    () => Object.values(unreadBySenderId).reduce((a, b) => a + b, 0),
    [unreadBySenderId],
  );

  const value = useMemo(
    () => ({
      totalUnread,
      unreadBySenderId,
      preferences,
      setSoundEnabled,
      setVibrationEnabled,
      setBrowserNotificationsEnabled,
      refreshUnreadCounts,
      setActiveChatPartnerId,
      notifyConversationOpened,
    }),
    [
      totalUnread,
      unreadBySenderId,
      preferences,
      setSoundEnabled,
      setVibrationEnabled,
      setBrowserNotificationsEnabled,
      refreshUnreadCounts,
      setActiveChatPartnerId,
      notifyConversationOpened,
    ],
  );

  return (
    <MessageNotificationsContext.Provider value={value}>
      <View
        style={styles.flex}
        onStartShouldSetResponderCapture={() => {
          markNotificationAudioUnlockedFromUserGesture();
          return false;
        }}
      >
        {children}
      </View>

      {visibleToast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.toastWrap, { opacity: toastOpacity, transform: [{ translateY: toastSlide }] }]}
        >
          <Pressable style={({ pressed }) => [styles.toastInner, pressed && styles.toastPressed]}>
            <Text style={styles.toastTitle}>{visibleToast.title}</Text>
            <Text style={styles.toastBody} numberOfLines={3}>
              {visibleToast.body}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </MessageNotificationsContext.Provider>
  );
}

export function useMessageNotifications(): MessageNotificationsContextValue {
  const ctx = useContext(MessageNotificationsContext);
  if (!ctx) {
    throw new Error('useMessageNotifications must be used within MessageNotificationsProvider');
  }
  return ctx;
}

export function useMessageNotificationsOptional(): MessageNotificationsContextValue | null {
  return useContext(MessageNotificationsContext);
}

export function useNotificationAudioUnlocked(): boolean {
  const [unlocked, setUnlocked] = useState(isNotificationAudioGestureUnlocked);

  useEffect(() => {
    const id = setInterval(() => {
      if (isNotificationAudioGestureUnlocked()) {
        setUnlocked(true);
        clearInterval(id);
      }
    }, 400);
    return () => clearInterval(id);
  }, []);

  return unlocked;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  toastWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: Platform.OS === 'web' ? 12 : 52,
    zIndex: 9999,
    elevation: 12,
  },
  toastInner: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  toastPressed: {
    opacity: 0.92,
  },
  toastTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  toastBody: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
});
