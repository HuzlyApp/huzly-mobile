import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '@/lib/messages/messages.service';

const RECEIVED_BG = '#ECF1F9';
const GRADIENT_START = '#4473C0';
const GRADIENT_END = '#2DD4BF';
const AI_AVATAR_BG = '#4473C0';
const FILE_ICON_BG = '#E8EDFB';
const FILE_ICON_BG_OWN = 'rgba(255,255,255,0.2)';

interface Props {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return 'FILE';
  return parts[parts.length - 1].toUpperCase();
}

function getFileIcon(fileType: string): keyof typeof Ionicons.glyphMap {
  if (fileType.startsWith('image/')) return 'image-outline';
  if (fileType.includes('pdf')) return 'document-text-outline';
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return 'grid-outline';
  if (fileType.includes('word') || fileType.includes('document')) return 'document-outline';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'archive-outline';
  if (fileType.includes('video')) return 'videocam-outline';
  if (fileType.includes('audio')) return 'musical-notes-outline';
  return 'document-attach-outline';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageBubble({ message, isOwn, isAI }: Props) {
  const attachment = (message as any).attachments;
  const isImage = attachment && typeof attachment.fileType === 'string' && attachment.fileType.startsWith('image/');
  const hasText = !!message.content;

  const handleOpenAttachment = () => {
    if (!attachment?.fileUrl) return;
    Linking.openURL(attachment.fileUrl).catch(() => {});
  };

  const timeLabel = isAI && !isOwn ? (
    <Text style={styles.aiLabel}>AI Agent • Just now</Text>
  ) : (
    <Text style={[styles.time, isOwn && styles.timeOwn]}>
      {new Date(message.sent_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </Text>
  );

  const renderTextBubble = () => {
    if (!hasText) return null;

    const textContent = (
      <>
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.content}</Text>
        {!attachment && timeLabel}
      </>
    );

    if (isOwn) {
      return (
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleSent, attachment && styles.bubbleNoBottomRadius]}
        >
          {textContent}
        </LinearGradient>
      );
    }

    return (
      <View style={[styles.bubble, styles.bubbleReceived, attachment && styles.bubbleNoBottomRadius]}>
        {textContent}
      </View>
    );
  };

  const renderImageAttachment = () => {
    if (!isImage) return null;

    return (
      <Pressable onPress={handleOpenAttachment} style={styles.imageWrapper}>
        <Image
          source={{ uri: attachment.fileUrl }}
          style={[
            styles.messengerImage,
            !hasText && (isOwn ? styles.imageRoundedFull : styles.imageRoundedFullReceived),
            hasText && (isOwn ? styles.imageRoundedBottomOwn : styles.imageRoundedBottomReceived),
          ]}
          resizeMode="cover"
        />
        <View style={styles.imageTimeOverlay}>
          <Text style={styles.imageTimeText}>
            {new Date(message.sent_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderFileAttachment = () => {
    if (!attachment || isImage) return null;

    const ext = getFileExtension(attachment.fileName || 'file');
    const icon = getFileIcon(attachment.fileType || '');

    const fileCard = (
      <Pressable
        onPress={handleOpenAttachment}
        style={[
          styles.fileCard,
          isOwn ? styles.fileCardOwn : styles.fileCardReceived,
          hasText && styles.fileCardAttached,
        ]}
      >
        <View style={[styles.fileIconCircle, isOwn && styles.fileIconCircleOwn]}>
          <Ionicons name={icon} size={20} color={isOwn ? '#FFFFFF' : '#4473C0'} />
        </View>
        <View style={styles.fileMeta}>
          <Text
            style={[styles.fileName, isOwn && styles.fileNameOwn]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {attachment.fileName}
          </Text>
          <Text style={[styles.fileInfo, isOwn && styles.fileInfoOwn]}>
            {ext} • {formatFileSize(attachment.fileSize ?? 0)}
          </Text>
        </View>
        <Ionicons
          name="download-outline"
          size={18}
          color={isOwn ? 'rgba(255,255,255,0.7)' : '#94A3B8'}
        />
      </Pressable>
    );

    return (
      <>
        {fileCard}
        <View style={styles.fileTimeRow}>
          {timeLabel}
        </View>
      </>
    );
  };

  const content = (
    <View style={styles.contentGroup}>
      {renderTextBubble()}
      {renderImageAttachment()}
      {renderFileAttachment()}
    </View>
  );

  if (!isOwn && isAI) {
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiAvatar}>
          <Ionicons name="person" size={14} color="#FFFFFF" />
        </View>
        <View style={styles.bubbleContainer}>
          {content}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <View style={styles.bubbleContainer}>
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AI_AVATAR_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  aiLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#94A3B8',
  },
  bubbleContainer: {
    maxWidth: '78%',
  },
  contentGroup: {
    overflow: 'hidden',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSent: {
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: RECEIVED_BG,
    borderBottomLeftRadius: 4,
  },
  bubbleNoBottomRadius: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: 18,
    borderBottomStartRadius: 0,
    borderBottomEndRadius: 0,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  textOwn: {
    color: '#FFFFFF',
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: '#94A3B8',
    alignSelf: 'flex-end',
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },

  imageWrapper: {
    position: 'relative',
  },
  messengerImage: {
    width: 220,
    height: 220,
  },
  imageRoundedFull: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  imageRoundedFullReceived: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  imageRoundedBottomOwn: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  imageRoundedBottomReceived: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  imageTimeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageTimeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 10,
  },
  fileCardOwn: {
    backgroundColor: 'rgba(68,115,192,0.15)',
    borderBottomRightRadius: 4,
  },
  fileCardReceived: {
    backgroundColor: RECEIVED_BG,
    borderBottomLeftRadius: 4,
  },
  fileCardAttached: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  fileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FILE_ICON_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconCircleOwn: {
    backgroundColor: FILE_ICON_BG_OWN,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  fileNameOwn: {
    color: '#1E293B',
  },
  fileInfo: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  fileInfoOwn: {
    color: '#64748B',
  },
  fileTimeRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
});
