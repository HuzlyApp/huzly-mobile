import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TEAL = '#0D9488';

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
        <Ionicons name="attach" size={22} color="#94A3B8" />
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
          placeholder="Write a message..."
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          multiline
        />
        {uploading ? (
          <Text style={styles.statusText}>Uploading…</Text>
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
          <Ionicons name="send" size={18} color="#FFFFFF" />
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
    borderTopColor: '#E6EEF6',
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
  },
  attachmentName: {
    maxWidth: 160,
    fontSize: 12,
    color: '#1E293B',
    marginRight: 6,
  },
  attachmentRemove: {
    fontSize: 14,
    color: '#64748B',
  },
  statusText: {
    marginTop: 4,
    fontSize: 11,
    color: '#94A3B8',
  },
  statusError: {
    color: '#DC2626',
  },
});
