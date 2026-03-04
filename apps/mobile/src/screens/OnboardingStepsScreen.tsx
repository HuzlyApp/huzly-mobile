import { router } from "expo-router";
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingStepItem } from '@/components/Onboarding/OnboardingStepItem';
import { ProgressCard } from '@/components/Onboarding/ProgressCard';

type OnboardingStep = {
  id: string;
  title: string;
  subtitle: string;
  routeKey: string;
  isComplete: boolean;
};

const BACKGROUND = '#F3F4F6';
const TEXT_PRIMARY = '#111827';

const STEPS: OnboardingStep[] = [
  {
    id: 'upload-resume',
    title: 'Upload Resume',
    subtitle: 'Configure your digital profile.',
    routeKey: 'upload-resume',
    isComplete: false,
  },
  {
    id: 'add-skills-role',
    title: 'Add Skills / Role',
    subtitle: 'Add relevant skills and responsibilities.',
    routeKey: 'add-skills-role',
    isComplete: false,
  },
  {
    id: 'upload-requirements',
    title: 'Upload Requirements',
    subtitle: 'Provide documents needed for review',
    routeKey: 'upload-requirements',
    isComplete: false,
  },
  {
    id: 'acknowledgement',
    title: 'Acknowledgement',
    subtitle: 'Confirm you have read and understood.',
    routeKey: 'acknowledgement',
    isComplete: false,
  },
  {
    id: 'setup-payment-method',
    title: 'Setup Payment Method',
    subtitle: 'Choose how you want to get paid.',
    routeKey: 'setup-payment-method',
    isComplete: false,
  },
  {
    id: 'approval-status',
    title: 'Approval Status',
    subtitle: 'Track your application progress.',
    routeKey: 'approval-status',
    isComplete: false,
  },
];

const PLACEHOLDER_PROGRESS_PERCENT = 15;

export default function OnboardingStepsScreen() {
  const completedSteps = STEPS.filter((step) => step.isComplete).length;
  const computedProgress =
    STEPS.length === 0 ? 0 : Math.round((completedSteps / STEPS.length) * 100);

  const progressPercent = PLACEHOLDER_PROGRESS_PERCENT || computedProgress;

  const handleStepPress = (step: OnboardingStep) => {
    if (step.id === "add-skills-role") {
      router.push({ pathname: '/job-roles' });
      console.log('[Onboarding] pressed:', step.id, step.routeKey, step.title);
      return;
    }
    if (step.id === "upload-requirements") {
      router.push({ pathname: '/requirements' });
      console.log('[Onboarding] pressed:', step.id, step.routeKey, step.title);
      return;
    }
    if (step.id === "acknowledgement") {
      router.push({ pathname: '/acknowledgement' });
      console.log('[Onboarding] pressed:', step.id, step.routeKey, step.title);
      return;
    }
    if (step.id === "setup-payment-method") {
      router.push({ pathname: '/payment-method' });
      console.log('[Onboarding] pressed:', step.id, step.routeKey, step.title);
      return;
    }
  
    console.log('Onboarding step pressed', step.routeKey);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Onboarding Steps</Text>
        </View>

        <View style={styles.sectionSpacing}>
          <ProgressCard percentage={progressPercent} />
        </View>

        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <OnboardingStepItem
              key={step.id}
              index={index + 1}
              title={step.title}
              subtitle={step.subtitle}
              onPress={() => handleStepPress(step)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  sectionSpacing: {
    marginBottom: 24,
  },
  stepsContainer: {
    marginTop: 4,
  },
});

