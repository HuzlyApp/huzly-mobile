import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';

import { useMessageNotificationsOptional } from '@/contexts/MessageNotificationsContext';

/** Selected tab: light pill + blue glyph/label (all items match messaging) */
const NAV_ACTIVE_BLUE = '#2563EB';
const NAV_ACTIVE_PILL_BG = '#DBEAFE';

const DASHBOARD_LOGO = require('../../../public/dashboard.png');
const BROWSE_LOGO = require('../../../public/browse.png');
const JOBS_LOGO = require('../../../public/jobs.png');
const CHAT_LOGO = require('../../../public/chat.png');

interface Props {
  active?: 'home' | 'explore' | 'jobs' | 'message' | 'profile';
}

type NavItem = {
  name: NonNullable<Props['active']>;
  label: string;
  route?: string;
  /** Bundled PNG from `public/` — tinted like other bar icons */
  imageSource?: number;
  /** Ionicons base name when `imageSource` is omitted */
  icon?: string;
};

export default function BottomNav({ active }: Props) {
  const router = useRouter();
  const messageNotif = useMessageNotificationsOptional();
  const unreadTotal = messageNotif?.totalUnread ?? 0;

  const items: NavItem[] = [
    { name: 'home', label: 'Dashboard', route: '/onboarding-steps', imageSource: DASHBOARD_LOGO },
    /** Must include (tabs) group or navigation falls back to the default tab (home / Apply as Worker). */
    { name: 'explore', label: 'Browse', route: '/(tabs)/explore', imageSource: BROWSE_LOGO },
    { name: 'jobs', label: 'My Jobs', route: '/job-roles', imageSource: JOBS_LOGO },
    { name: 'message', label: 'Message', route: '/messaging', imageSource: CHAT_LOGO },
    { name: 'profile', label: 'Profile', route: '/profile', icon: 'person' },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isActive = active != null && item.name === active;
        const isMessage = item.name === 'message';
        const iconName =
          item.icon != null ? (isActive ? item.icon : `${item.icon}-outline`) : 'ellipse';
        const showBadge = isMessage && unreadTotal > 0;
        const iconWrapStyle = [styles.iconWrap, isActive && styles.iconWrapActive];
        const navImageTint = isActive ? NAV_ACTIVE_BLUE : '#94A3B8';
        return (
          <Pressable
            key={item.name}
            style={styles.item}
            accessibilityRole="button"
            onPress={() => {
              if (!item.route) return;
              /** navigate (not push) so stack screens e.g. onboarding open the tab group on the right tab, not default Home. */
              router.navigate(item.route as Href);
            }}
          >
            <View style={iconWrapStyle}>
              {item.imageSource != null ? (
                <Image
                  source={item.imageSource}
                  style={[styles.navIconImage, { tintColor: navImageTint }]}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name={iconName as any} size={20} color={isActive ? NAV_ACTIVE_BLUE : '#94A3B8'} />
              )}
              {showBadge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadTotal > 99 ? '99+' : String(unreadTotal)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
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
    backgroundColor: NAV_ACTIVE_PILL_BG,
  },
  navIconImage: {
    width: 22,
    height: 22,
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
    color: NAV_ACTIVE_BLUE,
    fontWeight: '600',
  },
});
