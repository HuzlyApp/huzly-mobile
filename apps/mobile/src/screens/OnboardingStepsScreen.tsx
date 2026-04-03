import { MaterialIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingStepItem } from '@/components/Onboarding/OnboardingStepItem';
import { ProgressCard } from '@/components/Onboarding/ProgressCard';
import BottomNav from '@/components/ui/BottomNav';
import { getWorkerOnboardingStep } from '@/lib/auth/user.service';
import { supabase } from '@/lib/config/supabase';

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
    id: 'resume-upload',
    title: 'Upload Resume',
    subtitle: 'Configure your digital profile.',
    routeKey: 'resume-upload',
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const loadStep = async () => {
      const { step } = await getWorkerOnboardingStep();
      if (!isMounted) return;
      setOnboardingStep(step);
    };

    loadStep();

    return () => {
      isMounted = false;
    };
  }, []);

  const completedSteps = Math.min(onboardingStep, STEPS.length);
  const computedProgress =
    STEPS.length === 0 ? 0 : Math.round((completedSteps / STEPS.length) * 100);

  const progressPercent = computedProgress;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Error logging out: ' + error.message);
      } else {
        router.replace('/welcome');
      }
    } catch (err) {
      console.error('Logout exception:', err);
      alert('An error occurred while logging out');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleStepPress = (step: OnboardingStep) => {
    switch (step.id) {
      case 'resume-upload':
        router.push({ pathname: '/resume-upload' });
        break;
      case 'add-skills-role':
        router.push({ pathname: '/job-roles' });
        break;
      case 'upload-requirements':
        router.push({ pathname: '/requirements' });
        break;
      case 'acknowledgement':
        router.push({ pathname: '/acknowledgement' });
        break;
      case 'setup-payment-method':
        router.push({ pathname: '/payment-method' });
        break;
      default:
        console.log('Onboarding step pressed', step.routeKey);
        return;
    }

    console.log('[Onboarding] pressed:', step.id, step.routeKey, step.title);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Onboarding Steps</Text>
            <Pressable
              style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size={20} color="#6B7280" />
              ) : (
                <MaterialIcons name="logout" size={20} color="#6B7280" />
              )}
            </Pressable>
          </View>
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
              isComplete={index + 1 <= onboardingStep}
              onPress={() => handleStepPress(step)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom navigation (same as messages) */}
      <BottomNav active="home" />
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
    paddingBottom: 96,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  sectionSpacing: {
    marginBottom: 24,
  },
  stepsContainer: {
    marginTop: 4,
  },
});

