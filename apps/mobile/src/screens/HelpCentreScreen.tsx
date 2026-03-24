import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BottomNav from '@/components/ui/BottomNav';

const PRIMARY = '#4473C0';
const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';
const CARD_BG = '#F0F4FA';

export default function HelpCentreScreen() {
  const router = useRouter();

  const faqItems = [
    {
      title: 'Worker FAQ',
      description: 'Quick answers to common worker questions.',
    },
    {
      title: 'Adjusting and disputing your hours after shift',
      description: 'Fix or report hour discrepancies after your shift',
    },
    {
      title: 'Payment dispute',
      description: 'Resolve payment issues quickly and easily.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={PRIMARY} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Pressable style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={24} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Hello, How can we help?</Text>

        <Pressable style={styles.aiBtn}>
          <Ionicons name="sparkles-outline" size={18} color={PRIMARY} />
          <Text style={styles.aiBtnText}>Ask AI Assistant</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionCardText}>Send us message</Text>
          <View style={styles.sendIconCircle}>
            <Ionicons name="send" size={14} color={PRIMARY} />
          </View>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/messaging' as any)}
        >
          <Text style={styles.actionCardText}>Open Ticket</Text>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </Pressable>

        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

        {faqItems.map((item, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [styles.faqCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.faqContent}>
              <Text style={styles.faqItemTitle}>{item.title}</Text>
              <Text style={styles.faqItemDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </Pressable>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 15,
    color: PRIMARY,
  },
  helpBtn: {
    padding: 6,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 20,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  aiBtnText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  actionCardText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  sendIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 20,
    marginBottom: 14,
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    marginBottom: 10,
  },
  faqContent: {
    flex: 1,
    marginRight: 8,
  },
  faqItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  faqItemDesc: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
});
