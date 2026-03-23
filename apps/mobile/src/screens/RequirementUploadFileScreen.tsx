import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FileBadge } from '@/components/Requirements/FileBadge';
import { getRequirementById } from '@/constants/requirements';
import { useRequirementsUpload } from '@/stores/RequirementsUploadContext';
import { getCurrentUserId } from '@/lib/auth/user.service';
import {
  clearWorkerRequirementFileFromStorageAndDb,
  uploadWorkerRequirementFileToStorageAndDb,
} from '@/lib/requirements/worker-requirements-storage.service';

const BACKGROUND = '#F3F4F6';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const PRIMARY_BLUE = '#2F6BFF';
const CARD_BORDER = '#2F6BFF';

export default function RequirementUploadFileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const requirement = useMemo(() => getRequirementById(params.id), [params.id]);

  const { files, removeFile } = useRequirementsUpload();
  const file = requirement ? files[requirement.id] : undefined;
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Edge case: if user lands here but no file exists, redirect to dropzone upload screen.
    if (requirement && !file) {
      router.replace({ pathname: '/requirements/upload', params: { id: requirement.id } });
    }
  }, [requirement, file, router]);

  const handleBack = () => router.back();

  const handleSkip = () => {
    // TODO: Implement dedicated skip behavior if required
    router.back();
  };

  const handleTrash = () => {
    if (!requirement) return;

    void (async () => {
      const { userId, error: userError } = await getCurrentUserId();
      if (userError || !userId) {
        Alert.alert('Error', userError ?? 'Not authenticated.');
        return;
      }

      const { error: clearError } = await clearWorkerRequirementFileFromStorageAndDb({
        userId,
        requirementId: requirement.id,
      });

      if (clearError) {
        Alert.alert('Error', clearError);
        return;
      }

      removeFile(requirement.id);
      router.replace({ pathname: '/requirements/upload', params: { id: requirement.id } });
    })();
  };

  const handleSave = () => {
    if (!requirement || !file) return;
    const uri = file.uri;
    if (!uri) {
      Alert.alert('Error', 'No file found to upload.');
      return;
    }

    (async () => {
      setIsSaving(true);
      try {
        const { userId, error: userError } = await getCurrentUserId();
        if (userError || !userId) {
          Alert.alert('Error', userError ?? 'Not authenticated.');
          return;
        }

        const { error: uploadError } = await uploadWorkerRequirementFileToStorageAndDb({
          userId,
          requirementId: requirement.id,
          file: { uri, name: file.name ?? null, mimeType: file.mimeType ?? null },
        });

        if (uploadError) {
          Alert.alert('Upload failed', uploadError);
          return;
        }

        router.back();
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const uploadTitle = requirement?.uploadTitle ?? 'Upload Requirement';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={handleBack} style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </Pressable>

          <Text style={styles.headerTitle}>Requirements</Text>

          {/* <Pressable hitSlop={8} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable> */}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.screenTitle}>{uploadTitle}</Text>

          {file ? (
            <View style={styles.fileCard}>
              <FileBadge filename={file.name} />

              <View style={styles.fileMeta}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileSize}>{file.sizeLabel}</Text>
              </View>

              <Pressable hitSlop={8} onPress={handleTrash} style={styles.trashButton}>
                <Ionicons name="trash-outline" size={18} color={PRIMARY_BLUE} />
              </Pressable>
            </View>
          ) : (
            <Text style={{ color: TEXT_SECONDARY }}>No file found.</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={handleBack}>
            <Text style={[styles.footerButtonText, styles.footerButtonTextOutline]}>Back</Text>
          </Pressable>

          <Pressable
            disabled={isSaving}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              isSaving ? { opacity: 0.6 } : null,
            ]}
            onPress={handleSave}>
            <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerIconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  skipText: {
    fontSize: 13,
    color: PRIMARY_BLUE,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 14,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
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
  trashButton: {
    paddingLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonOutline: {
    borderWidth: 1,
    borderColor: PRIMARY_BLUE,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  footerButtonPrimary: {
    backgroundColor: PRIMARY_BLUE,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtonTextOutline: {
    color: PRIMARY_BLUE,
  },
  footerButtonTextPrimary: {
    color: '#FFFFFF',
  },
});