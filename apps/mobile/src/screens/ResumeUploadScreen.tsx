import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

import { UploadDropzone } from '@/components/Upload/UploadDropzone';
import { ALLOWED_TYPES_TEXT, getRequirementById } from '@/constants/requirements';
import { getCurrentUserId } from '@/lib/auth/user.service';
import { parseResumeWithGrok } from '@/lib/resume/resume-parser.service';
import { replaceWorkerResumeInStorage } from '@/lib/resume/resume-storage.service';
import { useRequirementsUpload, type UploadKey } from '@/stores/RequirementsUploadContext';

const BACKGROUND = '#F3F4F6';
const TEXT_PRIMARY = '#111827';
const PRIMARY_BLUE = '#2F6BFF';

export default function ResumeUploadScreen() {
  const router = useRouter();
  const [isPicking, setIsPicking] = useState(false);
  const params = useLocalSearchParams<{ id?: string }>();

  const requirement = getRequirementById(params.id);

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    router.back();
  };

  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'application/pdf'];
  const MAX_BYTES = 10 * 1024 * 1024;

  const showToast = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const { setFile, setResumeReviewData } = useRequirementsUpload();

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)}kb`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)}mb`;
  };

  const handleBrowse = async () => {
    if (isPicking) return;

    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? ['image/*', 'application/pdf'] : ALLOWED_MIME,
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      if (asset.mimeType && !ALLOWED_MIME.includes(asset.mimeType)) {
        showToast('Unsupported file', 'Only PNG, JPG, or PDF files are allowed.');
        return;
      }

      if (asset.size && asset.size > MAX_BYTES) {
        showToast('File too large', 'Maximum file size is 10MB.');
        return;
      }

      // Store the picked file under a fixed "resume" key in the upload context
      setFile('resume' as UploadKey, {
        name: asset.name ?? 'resume',
        uri: asset.uri,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
        sizeLabel: formatBytes(asset.size) || '—',
      });

      // 1) Upload resume to Supabase Storage (one resume per user)
      const { userId, error: userError } = await getCurrentUserId();
      if (!userId || userError) {
        showToast('Error', userError ?? 'Not authenticated.');
        return;
      }

      const { path, error: storageError } = await replaceWorkerResumeInStorage({
        userId,
        file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType },
      });

      if (storageError) {
        console.log('test-storageError',storageError)
        showToast('Error', storageError);
        return;
      }

      if (!path) {
        showToast('Error', 'Could not determine uploaded resume path.');
        return;
      }

      // 2) Call resume parser API with bucket+path (private bucket)
      const { data, error } = await parseResumeWithGrok({
        bucket: 'worker-onboarding',
        path,
      });

      if (!error && data) {
        setResumeReviewData(data);
      }

      router.replace({ pathname: '/resume-review' });
    } catch (e) {
      showToast('Error', 'Could not open the file picker.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleUpload = () => {
    router.replace({ pathname: '/resume-review' });
  };

  const uploadTitle = 'Upload Resume';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={handleBack} style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.headerTitle}>Resume</Text>
          <Pressable hitSlop={8} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <UploadDropzone
            title={uploadTitle}
            allowedTypesText={requirement?.allowedTypesText ?? ALLOWED_TYPES_TEXT}
            onPressBrowse={handleBrowse}
          />
        </View>

        <View style={styles.footer}>
          <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={handleBack}>
            <Text style={[styles.footerButtonText, styles.footerButtonTextOutline]}>Back</Text>
          </Pressable>
          <Pressable
            disabled={isPicking}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              isPicking && { opacity: 0.6 },
            ]}
            onPress={handleUpload}
          >
            <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>
              {isPicking ? 'Loading...' : 'Upload'}
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

