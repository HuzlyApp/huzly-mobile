import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PRIMARY_BLUE = '#2F6BFF';

export function FileBadge({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  const icon =
    ext === 'pdf'
      ? 'document-text-outline'
      : ext === 'png' || ext === 'jpg' || ext === 'jpeg'
      ? 'image-outline'
      : 'document-outline';

  const label = ext ? ext.toUpperCase() : 'FILE';

  return (
    <View style={styles.badge}>
      <Ionicons name={icon as any} size={14} color={PRIMARY_BLUE} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
});