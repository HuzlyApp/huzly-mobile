import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'react-native';
const ClipIcon = require('../../../assets/images/clip.png');
const EmojiIcon = require('../../../assets/images/emoji.png');
const SendIcon = require('../../../assets/images/send.png');

type SelectedFile = {
  name: string;
  size: number;
  mimeType: string;
};

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  sending?: boolean;
  onAttachPress?: () => void;
  selectedFile?: SelectedFile | null;
  onClearAttachment?: () => void;
  uploading?: boolean;
  uploadError?: string | null;
}

export default function MessageInput({
  value,
  onChangeText,
  onSend,
  sending,
  onAttachPress,
  selectedFile,
  onClearAttachment,
  uploading,
  uploadError,
}: Props) {
  const disabled = (!value.trim() && !selectedFile) || sending || uploading;

  return (
    <View style={styles.container}>
      <Pressable style={styles.iconButton} onPress={onAttachPress} accessibilityLabel="Attach">
        <Image source={ClipIcon} style={{ width: 20, height: 20 }} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={() => {}} accessibilityLabel="Emoji">
        <Image source={EmojiIcon} style={{ width: 20, height: 20 }} />
      </Pressable>
      <View style={styles.inputWrapper}>
        {selectedFile ? (
          <View style={styles.attachmentChip}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Pressable onPress={onClearAttachment} hitSlop={6}>
              <Text style={styles.attachmentRemove}>×</Text>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
          value={value}
          onChangeText={onChangeText}
          multiline
        />
        {uploading ? (
          <Text style={styles.statusText}>Uploading attachment…</Text>
        ) : uploadError ? (
          <Text style={[styles.statusText, styles.statusError]}>{uploadError}</Text>
        ) : null}
      </View>
      <Pressable
        style={[styles.sendButton, disabled && styles.sendDisabled]}
        onPress={onSend}
        disabled={disabled}
        accessibilityLabel="Send"
      >
        {sending || uploading ? (
          <Text style={styles.sendText}>…</Text>
        ) : (
          <Image source={SendIcon} style={{ width: 18, height: 18 }} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  icon: { fontSize: 18 },
  inputWrapper: {
    flex: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B6FD8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5F0FF',
  },
  attachmentName: {
    maxWidth: 160,
    fontSize: 12,
    color: '#1F2937',
    marginRight: 6,
  },
  attachmentRemove: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
  statusError: {
    color: '#DC2626',
  },
});
