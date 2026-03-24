import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { supabase } from '@/lib/config/supabase';
import BottomNav from '@/components/ui/BottomNav';

const PRIMARY = '#4473C0';
const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E6EEF6';

export default function ProfileMenuScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [pushNotification, setPushNotification] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const userName = session?.user?.user_metadata?.full_name || 'John Doe';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert('Error logging out: ' + error.message);
      } else {
        router.replace('/welcome');
      }
    } catch {
      alert('An error occurred while logging out');
    } finally {
      setLoggingOut(false);
    }
  };

  const menuItems = [
    {
      icon: 'ticket-outline' as const,
      label: 'Tickets',
      onPress: () => router.push('/messaging' as any),
    },
    {
      icon: 'notifications-outline' as const,
      label: 'Notifications',
      onPress: () => {},
    },
    {
      icon: 'headset-outline' as const,
      label: 'Support',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Help Centre',
      onPress: () => router.push('/help-centre' as any),
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      onPress: () => {},
    },
    {
      icon: 'people-outline' as const,
      label: 'Invite Friends',
      subtitle: 'Earn money by referring your friends!',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="menu-outline" size={26} color={TEXT_PRIMARY} />
        </Pressable>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={28} color="#94A3B8" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        <View style={styles.pushRow}>
          <Ionicons name="notifications-outline" size={20} color={TEXT_PRIMARY} />
          <Text style={styles.pushLabel}>Push Notification</Text>
          <Switch
            value={pushNotification}
            onValueChange={setPushNotification}
            trackColor={{ false: '#CBD5E1', true: PRIMARY }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#F8FAFC' }]}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={20} color={TEXT_PRIMARY} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                {item.subtitle && (
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>

        <View style={styles.legalSection}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#F8FAFC' }]}
          >
            <Text style={styles.legalLabel}>Legal</Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </Pressable>
        </View>

        <Pressable
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={TEXT_PRIMARY} />
          ) : (
            <Text style={styles.logoutText}>Log out</Text>
          )}
        </Pressable>

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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6EEF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
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
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  pushLabel: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  menuSection: {
    paddingTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  legalSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  legalLabel: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  logoutBtn: {
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  logoutText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
});
