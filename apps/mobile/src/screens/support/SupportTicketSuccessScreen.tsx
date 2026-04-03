import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BottomNav from '@/components/ui/BottomNav';

import { SUPPORT_BG, SUPPORT_PRIMARY, SUPPORT_TEXT, SUPPORT_MUTED, shortTicketId } from './support-ui';

export default function SupportTicketSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const ticketId = useMemo(() => {
    const raw = params.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.id]);

  const sid = ticketId ? shortTicketId(ticketId) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Success!</Text>
        <Text style={styles.sub}>
          Ticket has been submitted{sid ? `. Reference #${sid}` : '.'}
        </Text>

        <Pressable style={styles.back} onPress={() => router.replace('/support' as any)}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <BottomNav active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SUPPORT_BG },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: SUPPORT_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: SUPPORT_TEXT,
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    color: SUPPORT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  back: {
    alignSelf: 'stretch',
    backgroundColor: SUPPORT_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
