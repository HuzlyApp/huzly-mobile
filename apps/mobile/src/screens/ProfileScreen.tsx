import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuthSession } from '@/hooks/use-auth-session';
import BottomNav from '@/components/ui/BottomNav';

const PRIMARY = '#4473C0';
const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';
const STAR_COLOR = '#4473C0';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [publicView, setPublicView] = useState(true);

  const userName = session?.user?.user_metadata?.full_name || 'John Doe';
  const userEmail = session?.user?.email || '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="menu-outline" size={26} color={TEXT_PRIMARY} />
        </Pressable>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.push('/profile-menu' as any)}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.publicViewRow}>
          <Ionicons name="eye-outline" size={18} color={TEXT_SECONDARY} />
          <Text style={styles.publicViewLabel}>Public view is Enable</Text>
          <Switch
            value={publicView}
            onValueChange={setPublicView}
            trackColor={{ false: '#CBD5E1', true: PRIMARY }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#94A3B8" />
            </View>
            <Pressable style={styles.editAvatarBtn}>
              <Ionicons name="pencil" size={12} color={PRIMARY} />
            </Pressable>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name="star" size={16} color={STAR_COLOR} />
            ))}
          </View>
          <Text style={styles.bio}>Native California looking to grow professionally!</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>32</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Preferred</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={styles.detailLabel}>Work Status</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={styles.detailLabel}>
              Speaks in <Text style={styles.detailBold}>English & Chinese</Text>
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="briefcase-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={styles.detailLabel}>
              Interested in <Text style={styles.detailBold}>Full-time / Part-time job</Text>
            </Text>
          </View>
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>Achievements</Text>
          <Text style={styles.achievementsDesc}>
            Stand out as a Professional with badges that you can earn thru work
          </Text>
          <Pressable style={styles.badgesBtn}>
            <Text style={styles.badgesBtnText}>Start Earning Badges</Text>
          </Pressable>
        </View>

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
  headerBtn: {
    padding: 6,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  publicViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  publicViewLabel: {
    flex: 1,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6EEF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  statBox: {
    width: 90,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  detailsSection: {
    paddingVertical: 12,
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  detailBold: {
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#EEF2FF',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  achievementsSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 8,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  achievementsDesc: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  badgesBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: TEXT_PRIMARY,
  },
  badgesBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
});
