import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Message } from '@/lib/messages/messages.service';

const RECEIVED_BG = '#ECF1F9';
const GRADIENT_START = '#4473C0';
const GRADIENT_END = '#2DD4BF';

interface Props {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const attachment = (message as any).attachments;
  const isImage = attachment && typeof attachment.fileType === 'string' && attachment.fileType.startsWith('image/');

  const handleOpenAttachment = () => {
    if (!attachment?.fileUrl) return;
    Linking.openURL(attachment.fileUrl).catch(() => {});
  };

  const bubbleContent = (
    <>
      {message.content ? (
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.content}</Text>
      ) : null}

      {attachment ? (
        <Pressable
          style={[
            styles.attachmentContainer,
            isOwn ? styles.attachmentContainerOwn : styles.attachmentContainerOther,
          ]}
          onPress={handleOpenAttachment}
        >
          {isImage ? (
            <Image
              source={{ uri: attachment.fileUrl }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.attachmentIconBox}>
              <Text style={styles.attachmentIconText}>DOC</Text>
            </View>
          )}
          <View style={styles.attachmentMeta}>
            <Text
              style={[styles.attachmentName, isOwn && styles.attachmentNameOwn]}
              numberOfLines={1}
            >
              {attachment.fileName}
            </Text>
            <Text style={[styles.attachmentSize, isOwn && { color: 'rgba(255,255,255,0.7)' }]}>
              {Math.round((attachment.fileSize ?? 0) / 1024)} KB
            </Text>
            <Text style={[styles.attachmentHint, isOwn && { color: 'rgba(255,255,255,0.7)' }]}>Tap to open</Text>
          </View>
        </Pressable>
      ) : null}

      <Text style={[styles.time, isOwn && styles.timeOwn]}>
        {new Date(message.sent_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </>
  );

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {isOwn ? (
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleSent]}
        >
          {bubbleContent}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleReceived]}>
          {bubbleContent}
        </View>
      )}
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
  bubble: {
    maxWidth: '78%',
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
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
  },
  attachmentContainerOwn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  attachmentContainerOther: {
    backgroundColor: '#DAE2F0',
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  attachmentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachmentIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  attachmentNameOwn: {
    color: '#F9FAFB',
  },
  attachmentSize: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  attachmentHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
