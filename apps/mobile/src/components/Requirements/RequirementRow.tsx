import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  PressableStateCallbackType,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type UploadedFileLite = {
  name: string;
  sizeLabel: string; // e.g. "500kb"
};

type RequirementRowProps = {
  title: string;
  subtitle?: string;
  actionLabel: string;
  onPress: () => void;
  file?: UploadedFileLite;
  onRemoveFile?: () => void;
};

const BORDER_BLUE = '#C7D7FF';
const PRIMARY_BLUE = '#2F6BFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const CARD_BACKGROUND = '#FFFFFF';

export function RequirementRow({
  title,
  subtitle,
  actionLabel,
  onPress,
  file,
  onRemoveFile,
}: RequirementRowProps) {
  const containerStyle = ({ pressed }: PressableStateCallbackType): ViewStyle[] => [
    styles.container,
    pressed ? styles.containerPressed : {},
  ];

  const hasFile = Boolean(file);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(47, 107, 255, 0.06)', borderless: false }}
      style={containerStyle}
    >
      {/* Header Row */}
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text-outline" size={20} color={PRIMARY_BLUE} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {hasFile ? (
          <Ionicons name="checkmark-circle" size={18} color={PRIMARY_BLUE} />
        ) : (
          <Pressable
            onPress={onPress}
            android_ripple={{ color: 'rgba(47, 107, 255, 0.1)', borderless: false }}
            style={styles.actionPill}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>

      {/* File holder row (only if uploaded) */}
      {hasFile && file ? (
        <>
          <View style={styles.divider} />

          <View style={styles.fileRow}>
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>{getExtLabel(file.name)}</Text>
            </View>

            <View style={styles.fileMeta}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileSize}>{file.sizeLabel}</Text>
            </View>

            <Pressable
              hitSlop={8}
              onPress={() => onRemoveFile?.()}
              style={styles.trashBtn}
            >
              <Ionicons name="trash-outline" size={18} color={PRIMARY_BLUE} />
            </Pressable>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

function getExtLabel(filename: string) {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'FILE';
  if (ext.length > 4) return 'FILE';
  return ext;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_BLUE,
    backgroundColor: CARD_BACKGROUND,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  containerPressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(47, 107, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    backgroundColor: '#FFFFFF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 12,
    marginBottom: 12,
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  fileSize: {
    marginTop: 2,
    fontSize: 10,
    color: TEXT_SECONDARY,
  },
  trashBtn: {
    paddingLeft: 8,
  },
});