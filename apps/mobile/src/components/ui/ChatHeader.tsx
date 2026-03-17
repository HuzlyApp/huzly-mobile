import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
    console.log('Back button pressed');
    Alert.alert('Debug', 'Back button pressed');
    if (onBack) {
      console.log('Calling onBack prop');
      onBack();
    } else {
      console.log('Calling router.back()');
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleBack} style={styles.left} hitSlop={12} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={24} color="#111827" />
      </Pressable>

      <View style={styles.center} pointerEvents="none">
        <View style={styles.avatarWrap}>
          <Image source={Avatar} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Pressable onPress={onRight} style={styles.right} hitSlop={8} accessibilityLabel="Details">
        <View style={styles.rightIconWrap}>
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  left: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  right: { width: 40, alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 36, height: 36, borderRadius: 10, resizeMode: 'cover' },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2DD4BF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  rightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
