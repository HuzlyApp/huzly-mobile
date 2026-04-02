import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';

import { useMessageNotificationsOptional } from '@/contexts/MessageNotificationsContext';

const TEAL = '#0D9488';

interface Props {
  active?: 'home' | 'explore' | 'jobs' | 'message' | 'profile';
}

export default function BottomNav({ active = 'message' }: Props) {
  const router = useRouter();
  const messageNotif = useMessageNotificationsOptional();
  const unreadTotal = messageNotif?.totalUnread ?? 0;

  const items: { name: string; icon: string; label: string; route?: string }[] = [
    { name: 'home', icon: 'home', label: 'Dashboard', route: '/onboarding-steps' },
    { name: 'explore', icon: 'paper-plane', label: 'Browse', route: '/explore' },
    { name: 'jobs', icon: 'briefcase', label: 'My Jobs', route: '/job-roles' },
    { name: 'message', icon: 'chatbubble', label: 'Message', route: '/messaging' },
    { name: 'profile', icon: 'person', label: 'Profile', route: '/profile' },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isActive = item.name === active;
        const iconName = isActive ? item.icon : `${item.icon}-outline`;
        const showBadge = item.name === 'message' && unreadTotal > 0;
        return (
          <Pressable
            key={item.name}
            style={styles.item}
            accessibilityRole="button"
            onPress={() => item.route && router.push(item.route as Href)}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons name={iconName as any} size={20} color={isActive ? '#FFFFFF' : '#94A3B8'} />
              {showBadge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadTotal > 99 ? '99+' : String(unreadTotal)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EEF6',
  },
  item: {
    alignItems: 'center',
    width: 64,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: TEAL,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  labelActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
});
