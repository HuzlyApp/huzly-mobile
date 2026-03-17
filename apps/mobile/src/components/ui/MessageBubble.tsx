import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Message } from '@/lib/messages/messages.service';

interface Props {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const attachment = (message as any).attachments;
  const isImage = attachment && typeof attachment.fileType === 'string' && attachment.fileType.startsWith('image/');

  const handleOpenAttachment = () => {
    if (!attachment?.fileUrl) return;
    Linking.openURL(attachment.fileUrl).catch(() => {
      // swallow for now; could hook into a global toast/snackbar
    });
  };

  const Wrapper: any = isOwn ? LinearGradient : View;
  const wrapperProps = isOwn
    ? {
        colors: ['#4473C0', '#2DD4BF'],
        start: [0, 0],
        end: [1, 1],
      }
    : {};

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <Wrapper
        {...(wrapperProps as any)}
        style={[styles.bubble, isOwn ? styles.bubbleGradient : styles.bubbleOther]}
      >
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
              <Text style={styles.attachmentSize}>
                {Math.round((attachment.fileSize ?? 0) / 1024)} KB
              </Text>
              <Text style={styles.attachmentHint}>Tap to open</Text>
            </View>
          </Pressable>
        ) : null}

        <Text
          style={[
            styles.time,
            isOwn && styles.timeOwn,
          ]}
        >
          {new Date(message.sent_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
  },
  text: {
    fontSize: 14,
    color: '#111827',
  },
  textOwn: {
    color: '#FFFFFF',
  },
  time: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
    alignSelf: 'flex-end',
  },
  timeOwn: {
    color: '#E6F3F0',
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
  },
  attachmentContainerOwn: {
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  attachmentContainerOther: {
    backgroundColor: '#E5E7EB',
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
    color: '#111827',
  },
  attachmentNameOwn: {
    color: '#F9FAFB',
  },
  attachmentSize: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  attachmentHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
