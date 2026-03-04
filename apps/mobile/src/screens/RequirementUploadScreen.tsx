import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';

import { UploadDropzone } from '@/components/Upload/UploadDropzone';
import type { RequirementId } from '@/constants/requirements';
import { ALLOWED_TYPES_TEXT, getRequirementById } from '@/constants/requirements';
import { useRequirementsUpload } from '@/stores/RequirementsUploadContext';

const BACKGROUND = '#F3F4F6';
const TEXT_PRIMARY = '#111827';
const PRIMARY_BLUE = '#2F6BFF';

export default function RequirementUploadScreen() {
  const router = useRouter();
  const [isPicking, setIsPicking] = useState(false);
  const params = useLocalSearchParams<{ id?: string }>();

  const requirement = getRequirementById(params.id);

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    // TODO: Implement dedicated skip behavior if required
    router.back();
  };

  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

const showToast = (title: string, message: string) => {
  // Simple cross-platform feedback
  Alert.alert(title, message);
};

const handleBrowse = async () => {
  if (!requirement?.id || isPicking) return;

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

    // Validate file type (if mimeType is available)
    if (asset.mimeType && !ALLOWED_MIME.includes(asset.mimeType)) {
      showToast('Unsupported file', 'Only PNG, JPG, or PDF files are allowed.');
      return;
    }

    // Validate size (if size is available)
    if (asset.size && asset.size > MAX_BYTES) {
      showToast('File too large', 'Maximum file size is 10MB.');
      return;
    }

    setFile(requirement.id, {
      name: asset.name ?? 'file',
      uri: asset.uri,
      mimeType: asset.mimeType,
      sizeBytes: asset.size,
      sizeLabel: formatBytes(asset.size) || '—',
    });

    router.replace({ pathname: '/requirements/upload-file', params: { id: requirement.id } });
  } catch (e) {
    showToast('Error', 'Could not open the file picker.');
  } finally {
    setIsPicking(false);
  }
};

  const handleUpload = () => {
    if (!requirement?.id) return;
    const file = getMockFile(requirement.id);
    setFile(requirement.id as RequirementId, file);
    router.replace({pathname: '/requirements/upload',params: { id: requirement.id },});
    console.log('Upload requirement', requirement?.id);
  };

  const { setFile } = useRequirementsUpload();

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)}kb`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)}mb`;
  };

const getMockFile = (id?: string) => {
  switch (id) {
    case 'drivers_license':
      return { name: "drivers-license.jpg", sizeLabel: '500kb' };
    case 'certification':
      return { name: 'certification.jpg', sizeLabel: '500kb' };
    case 'drug_test':
      return { name: 'drug-test.png', sizeLabel: '500kb' };
    case 'w9':
      return { name: 'w9.pdf', sizeLabel: '500kb' };
    default:
      return { name: 'document.pdf', sizeLabel: '500kb' };
  }
};

  const uploadTitle =
    requirement?.uploadTitle ?? 'Upload Requirement';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={handleBack} style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.headerTitle}>Requirements</Text>
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

