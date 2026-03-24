import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title?: string;
  onBack?: () => void;
  onRight?: () => void;
}

export default function ChatHeader({ title, onBack, onRight }: Props) {
  const router = useRouter();
  const Avatar = require('../../../assets/images/icon.png');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleBack} style={styles.left} hitSlop={12} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={24} color="#111827" />
      </Pressable>

      <View style={styles.centerRow}>
        <View style={styles.avatarWrap}>
          <Image source={Avatar} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <Pressable onPress={onRight} style={styles.right} hitSlop={8} accessibilityLabel="Details">
        <View style={styles.rightIconWrap}>
          <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEF6',
  },
  left: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  right: {
    width: 36,
    alignItems: 'flex-end',
  },
  centerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative' as const,
    marginRight: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    resizeMode: 'cover' as const,
  },
  onlineDot: {
    position: 'absolute' as const,
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2DD4BF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  rightIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
