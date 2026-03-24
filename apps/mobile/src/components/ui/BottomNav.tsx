import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TEAL = '#0D9488';

interface Props {
  active?: 'home' | 'explore' | 'jobs' | 'message' | 'profile';
}

export default function BottomNav({ active = 'message' }: Props) {
  const router = useRouter();

  const items: { name: string; icon: string; label: string; route?: string }[] = [
    { name: 'home', icon: 'home', label: 'Dashboard', route: '/onboarding-steps' },
    { name: 'explore', icon: 'paper-plane', label: 'Browse', route: '/explore' },
    { name: 'jobs', icon: 'briefcase', label: 'My Jobs', route: '/job-roles' },
    { name: 'message', icon: 'chatbubble', label: 'Message', route: '/messaging' },
    { name: 'profile', icon: 'person', label: 'Profile', route: '/settings' },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isActive = item.name === active;
        const iconName = isActive ? item.icon : `${item.icon}-outline`;
        return (
          <Pressable
            key={item.name}
            style={styles.item}
            accessibilityRole="button"
            onPress={() => item.route && router.push(item.route)}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons name={iconName as any} size={20} color={isActive ? '#FFFFFF' : '#94A3B8'} />
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
