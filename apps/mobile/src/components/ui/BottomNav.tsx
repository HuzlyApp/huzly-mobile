import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  active?: 'home' | 'explore' | 'jobs' | 'message' | 'profile';
}

export default function BottomNav({ active = 'message' }: Props) {
  const router = useRouter();

  const Item = ({ name, label, route }: { name: string; label: string; route?: string }) => {
    const isActive = name === active;
    const handlePress = () => {
      // Special case: dashboard goes to onboarding
      if (route) router.push(route);
    };

    return (
      <Pressable style={styles.item} accessibilityRole="button" onPress={handlePress}>
        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
          <Ionicons name={isActive ? name : name + "-outline"} size={22} color={isActive ? '#FFFFFF' : '#9CA3AF'} />
        </View>
        <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Item name="home" label="Dashboard" route="/onboarding-steps" />
      <Item name="paper-plane" label="Browse" route="/explore" />
      <Item name="briefcase" label="My Jobs" route="/job-roles" />
      <Item name="chatbubble" label="Message" route="/messaging" />
      <Item name="person" label="Profile" route="/settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EEF6',
  },
  item: { alignItems: 'center', width: 70 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: '#4473C0',
  },
  label: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  labelActive: { color: '#111827', fontWeight: '600' },
});
