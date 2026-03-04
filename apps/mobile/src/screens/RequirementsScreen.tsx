import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequirementRow } from '@/components/Requirements/RequirementRow';
import { useRequirementsUpload } from '@/stores/RequirementsUploadContext';
import { REQUIREMENTS } from '@/constants/requirements';

const BACKGROUND = '#F3F4F6';
const TEXT_PRIMARY = '#000000';
const TEXT_SECONDARY = '#6D6D6D';
const PRIMARY_BLUE = '#2F6BFF';
const INFO_BORDER = '#AABEE1';
const INFO_BACKGROUND = '#F8FAFC';

export default function RequirementsScreen() {
  const router = useRouter();
  const { files, removeFile } = useRequirementsUpload();

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    // TODO: Implement dedicated skip behavior (e.g., persist skip state)
    router.back();
  };

  // const handleRequirementPress = (id: string) => {
  //   router.push({
  //     pathname: '/requirements/upload',
  //     params: { id },
  //   });
  // };

  const handleSubmit = () => {
    // TODO: Implement submit behavior when backend is ready
    // eslint-disable-next-line no-console
    console.log('Submit requirements');
  };

  

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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.screenTitle}>Upload your requirements</Text>

            {/* <View style={styles.listContainer}>
              {REQUIREMENTS.map((item) => (
                <RequirementRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  actionLabel={item.actionLabel}
                  onPress={() => handleRequirementPress(item.id)}
                />
              ))}
            </View> */}
            <View style={styles.listContainer}>
              {REQUIREMENTS.map((item) => {
                const file = files[item.id];

                const onOpen = () => {
                  if (file) {
                    router.push({pathname: '/requirements/upload-file',params: { id: item.id },});
                  } else {
                    router.push({pathname: '/requirements/upload',params: { id: item.id },});
                  }
                };

                const onRemove = () => removeFile(item.id);

                return (
                  <RequirementRow
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    actionLabel={item.actionLabel}
                    file={file}
                    onPress={onOpen}
                    onRemoveFile={onRemove}
                  />
                );
              })}
            </View>

            <Text style={styles.helperText}>Only support png, jpg or pdf files</Text>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={PRIMARY_BLUE}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Documents are not mandatory as of now; however, submitting them will increase your
                chances of getting hired.
              </Text>
            </View>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={handleBack}>
            <Text style={[styles.footerButtonText, styles.footerButtonTextOutline]}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.footerButton, styles.footerButtonPrimary]}
            onPress={handleSubmit}>
            <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>Submit</Text>
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
  },
  scrollContent: {
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 20,
  },
  listContainer: {
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: INFO_BORDER,
    backgroundColor: INFO_BACKGROUND,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_SECONDARY,
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

