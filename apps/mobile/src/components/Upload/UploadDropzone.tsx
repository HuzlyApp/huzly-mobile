import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type UploadDropzoneProps = {
  title: string;
  description?: string;
  allowedTypesText: string;
  onPressBrowse: () => void;
};

const BORDER_DASHED = '#D1D5DB';
const PRIMARY_BLUE = '#2F6BFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';

export function UploadDropzone({
  title,
  description = 'Drag your file(s) or browse',
  allowedTypesText,
  onPressBrowse,
}: UploadDropzoneProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-upload-outline" size={28} color={PRIMARY_BLUE} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>
        Drag your file(s) or{' '}
        <Text style={styles.browseText} onPress={onPressBrowse}>
          browse
        </Text>
      </Text>
      <Text style={styles.subtext}>Max 10 MB files are allowed</Text>
      <Text style={styles.allowedTypes}>{allowedTypesText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BORDER_DASHED,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(47, 107, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  browseText: {
    color: PRIMARY_BLUE,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  allowedTypes: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
});

