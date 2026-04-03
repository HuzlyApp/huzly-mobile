import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BottomNav from '@/components/ui/BottomNav';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  deleteSupportTicket,
  fetchSupportTicketsByUser,
  ticketIsOpen,
  type SupportTicket,
} from '@/lib/support/support-tickets.service';

import SupportTicketBrandIcon from './SupportTicketBrandIcon';
import {
  SUPPORT_BG,
  SUPPORT_BLUE,
  SUPPORT_BORDER,
  SUPPORT_CARD,
  SUPPORT_CARD_BORDER,
  SUPPORT_ICON_BLUE,
  SUPPORT_MUTED,
  SUPPORT_NAVY,
  SUPPORT_PRIMARY,
  SUPPORT_TEXT,
  formatTicketRelativeTime,
  listCardSnippet,
} from './support-ui';

const PAGE_SIZE = 8;

export default function SupportTicketsListScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuthSession();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);
  const searchRef = useRef<TextInput | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchSupportTicketsByUser(session.user.id);
    if (err) setError(err);
    else setTickets(data ?? []);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!session?.user?.id) {
        setLoading(false);
        setError('Sign in to view tickets.');
        return;
      }
      void load();
    }, [authLoading, session?.user?.id, load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = tickets.filter((t) => (tab === 'open' ? ticketIsOpen(t) : !ticketIsOpen(t)));
    if (!q) return base;
    return base.filter((t) => {
      const blob = `${t.id} ${t.subject ?? ''} ${t.description ?? ''} ${t.status}`.toLowerCase();
      return blob.includes(q);
    });
  }, [tickets, tab, query]);

  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, query, tickets.length]);

  const hasMore = filtered.length > displayed.length;

  const onArchiveRefTicket = async (t: SupportTicket) => {
    const text = `Ticket ${t.id}\n${t.subject ?? ''}\n${t.status}`;
    await Clipboard.setStringAsync(text);
    Alert.alert('Saved', 'Ticket reference copied to clipboard.');
  };

  const onDeleteTicket = (t: SupportTicket) => {
    if (!session?.user?.id) return;
    Alert.alert('Delete ticket', 'Remove this ticket from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: delErr } = await deleteSupportTicket(t.id, session.user.id);
          if (delErr) {
            Alert.alert('Could not delete', delErr);
            return;
          }
          setTickets((prev) => prev.filter((x) => x.id !== t.id));
        },
      },
    ]);
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.headerIcon} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={SUPPORT_NAVY} />
      </Pressable>
      <Text style={styles.headerTitle}>My Ticket</Text>
      <View style={styles.headerRight}>
        <Pressable
          style={styles.headerIcon}
          accessibilityLabel="Search tickets"
          onPress={() => searchRef.current?.focus()}
        >
          <Ionicons name="search-outline" size={22} color={SUPPORT_NAVY} />
        </Pressable>
        <Pressable
          style={styles.headerIcon}
          onPress={() => router.push('/support/new' as any)}
          accessibilityLabel="New ticket"
        >
          <Ionicons name="add" size={26} color={SUPPORT_BLUE} />
        </Pressable>
      </View>
    </View>
  );

  const searchRow = (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={18} color={SUPPORT_MUTED} style={styles.searchIcon} />
      <TextInput
        ref={searchRef}
        style={styles.searchInput}
        placeholder="Search tickets"
        placeholderTextColor="#94A3B8"
        value={query}
        onChangeText={setQuery}
      />
      {query.length > 0 ? (
        <Pressable onPress={() => setQuery('')} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={SUPPORT_MUTED} />
        </Pressable>
      ) : null}
    </View>
  );

  const segment = (
    <View style={styles.segment}>
      <Pressable
        style={[styles.segmentBtn, tab === 'open' && styles.segmentBtnActive]}
        onPress={() => setTab('open')}
      >
        <Text style={[styles.segmentText, tab === 'open' && styles.segmentTextActive]}>Open</Text>
      </Pressable>
      <Pressable
        style={[styles.segmentBtn, tab === 'closed' && styles.segmentBtnActive]}
        onPress={() => setTab('closed')}
      >
        <Text style={[styles.segmentText, tab === 'closed' && styles.segmentTextActive]}>Closed</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: SupportTicket }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/support/ticket/${item.id}` as any)}
    >
      <View style={styles.cardTop}>
        <SupportTicketBrandIcon size={40} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Support Ticket Update</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {listCardSnippet(item)}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTime}>{formatTicketRelativeTime(item.created_at)}</Text>
        <View style={styles.cardActions}>
          <Pressable
            style={styles.miniBtn}
            onPress={() => onDeleteTicket(item)}
            accessibilityLabel="Delete ticket"
          >
            <Ionicons name="trash-outline" size={20} color={SUPPORT_ICON_BLUE} />
          </Pressable>
          <Pressable
            style={styles.miniBtn}
            onPress={() => void onArchiveRefTicket(item)}
            accessibilityLabel="Copy ticket reference"
          >
            <Ionicons name="folder-outline" size={20} color={SUPPORT_ICON_BLUE} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  const listFooter = () => {
    if (displayed.length === 0) return null;
    if (!hasMore) return <View style={{ height: 16 }} />;
    return (
      <Pressable
        style={styles.loadMore}
        onPress={() => {
          setLoadMoreBusy(true);
          setTimeout(() => {
            setVisibleCount((c) => c + PAGE_SIZE);
            setLoadMoreBusy(false);
          }, 400);
        }}
      >
        {loadMoreBusy ? <ActivityIndicator size="small" color={SUPPORT_BLUE} /> : null}
        <Text style={styles.loadMoreText}>Load more</Text>
      </Pressable>
    );
  };

  if (loading && tickets.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SUPPORT_PRIMARY} />
        </View>
        <BottomNav active="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}
      {searchRow}
      {segment}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No tickets</Text>
            <Text style={styles.emptySub}>Create one with + in the header.</Text>
          </View>
        }
        ListFooterComponent={listFooter}
      />

      <BottomNav active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SUPPORT_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SUPPORT_CARD,
    borderBottomWidth: 1,
    borderBottomColor: SUPPORT_BORDER,
  },
  headerIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: SUPPORT_NAVY,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SUPPORT_BORDER,
    backgroundColor: SUPPORT_CARD,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: SUPPORT_NAVY, paddingVertical: 0 },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: SUPPORT_CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: SUPPORT_BLUE,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: SUPPORT_NAVY },
  segmentTextActive: { color: '#FFFFFF' },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: SUPPORT_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SUPPORT_CARD_BORDER,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: SUPPORT_NAVY, marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 19, color: SUPPORT_MUTED },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardTime: { fontSize: 12, color: SUPPORT_MUTED },
  cardActions: { flexDirection: 'row', gap: 2 },
  miniBtn: { padding: 6 },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: SUPPORT_BLUE },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: SUPPORT_NAVY },
  emptySub: { marginTop: 4, fontSize: 13, color: SUPPORT_MUTED, textAlign: 'center' },
});
