import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { advanceWorkerOnboardingStep, updateCurrentWorkerProfileFromResumeReview } from '@/lib/auth/user.service';
import { useRequirementsUpload } from '@/stores/RequirementsUploadContext';

const BACKGROUND = '#F3F4F6';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const TEXT_LABEL = '#374151';
const PRIMARY_BLUE = '#2F6BFF';
const BORDER_SOFT = '#94A3B8';
const INPUT_BG = '#FFFFFF';

export default function ResumeReviewScreen() {
  const router = useRouter();
  const { resumeReviewData } = useRequirementsUpload();

  const [firstName, setFirstName] = useState(() => resumeReviewData?.firstName ?? '');
  const [lastName, setLastName] = useState(() => resumeReviewData?.lastName ?? '');
  const [address1, setAddress1] = useState(() => resumeReviewData?.address1 ?? '');
  const [address2, setAddress2] = useState(() => resumeReviewData?.address2 ?? '');
  const [city, setCity] = useState(() => resumeReviewData?.city ?? '');
  const [state, setState] = useState(() => resumeReviewData?.state ?? '');
  const [phone, setPhone] = useState(() => resumeReviewData?.phone ?? '');
  const [email, setEmail] = useState(() => resumeReviewData?.email ?? '');
  const [jobRole, setJobRole] = useState(() => resumeReviewData?.jobRole ?? '');

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    router.replace('/onboarding-steps');
  };

  const handleSave = async () => {
    const { error } = await updateCurrentWorkerProfileFromResumeReview({
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      phone,
      email,
      jobRole,
    });

    if (!error) {
      await advanceWorkerOnboardingStep(1);
      router.replace('/onboarding-steps');
    }
  };

  const formatUsPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');

    if (!digits) return '';

    // Assume leading 1 is country code if present
    const withoutCountry = digits.startsWith('1') ? digits.slice(1) : digits;
    const sliced = withoutCountry.slice(0, 10);

    const area = sliced.slice(0, 3);
    const mid = sliced.slice(3, 6);
    const last = sliced.slice(6, 10);

    if (sliced.length <= 3) {
      return `+1 ${area}`;
    }
    if (sliced.length <= 6) {
      return `+1 ${area}-${mid}`;
    }
    return `+1 ${area}-${mid}-${last}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable hitSlop={8} onPress={handleBack} style={styles.headerIconButton}>
              <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
            </Pressable>

            <Text style={styles.headerTitle}>Resume Review</Text>

            <Pressable hitSlop={8} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor={TEXT_SECONDARY}
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor={TEXT_SECONDARY}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address 1</Text>
              <TextInput
                value={address1}
                onChangeText={setAddress1}
                placeholder="Street Address, P.O Box"
                placeholderTextColor={TEXT_SECONDARY}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address 2</Text>
              <TextInput
                value={address2}
                onChangeText={setAddress2}
                placeholder="Apt, Suite, Building, Floor, etc..."
                placeholderTextColor={TEXT_SECONDARY}
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={TEXT_SECONDARY}
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={TEXT_SECONDARY}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={(value) => setPhone(formatUsPhone(value))}
                placeholder="+1 800-512-2366"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Job Role</Text>
              <TextInput
                value={jobRole}
                onChangeText={setJobRole}
                placeholder="Job Role"
                placeholderTextColor={TEXT_SECONDARY}
                style={styles.input}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={[styles.footerButton, styles.footerButtonOutline]} onPress={handleBack}>
              <Text style={[styles.footerButtonText, styles.footerButtonTextOutline]}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, styles.footerButtonPrimary]}
              onPress={handleSave}
            >
              <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  flex: {
    flex: 1,
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
  scroll: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    marginBottom: 20,
  },
  fieldHalf: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
    color: TEXT_LABEL,
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
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

