import { MessageNotificationsProvider } from '@/contexts/MessageNotificationsContext';
import { RequirementsUploadProvider } from '@/stores/RequirementsUploadContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuthSession();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    /**
     * Current route examples:
     *
     * ["auth","otp"]
     * ["welcome"]
     * ["onboarding-steps"]
     * ["(tabs)"]
     */

    const inPublicFlow =
      segments[0] === 'auth' ||
      segments[0] === 'welcome' ||
      segments[0] === 'onboarding-steps' ||
      segments[0] === 'resume-upload' ||
      segments[0] === 'job-roles' ||
      segments[0] === 'requirements' ||
      segments[0] === 'resume-review' ||
      segments[0] === 'payment-method' ||
      segments[0] === 'acknowledgement' ||
      segments[0] === 'messaging' ||
      segments[0] === 'support' ||
      segments[0] === 'profile' ||
      segments[0] === 'profile-menu' ||
      segments[0] === 'help-centre' ||
      segments[0] === 'my-jobs';

    /**
     * If user is already inside auth / welcome / onboarding
     * DO NOT override navigation.
     */

    if (inPublicFlow) return;

    /**
     * If user has session → send them into the main app only from auth entry screens.
     * Avoid router.replace('/(tabs)') on every segment change: that resets the tab stack
     * to the default Home tab and breaks Browse → Explore (and keeps web URL on `/`).
     */
    if (session) {
      const entry = segments[0];
      if (entry === 'welcome' || entry === 'auth') {
        router.replace('/(tabs)');
      }
      return;
    }

    /**
     * If user has no session → go to welcome
     */

    router.replace('/welcome');

  }, [session, loading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RequirementsUploadProvider>
        <MessageNotificationsProvider>
          <Stack screenOptions={{ headerShown: false }}>

            {/* Public */}
            <Stack.Screen name="welcome" />
            <Stack.Screen name="auth" />

            {/* Main App */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="shift" />
            <Stack.Screen name="directions" />
            <Stack.Screen name="explore-map" />
            <Stack.Screen name="my-jobs" />

            {/* Messaging */}
            <Stack.Screen name="messaging" />
            <Stack.Screen name="support" />

            {/* Profile */}
            <Stack.Screen name="profile" />
            <Stack.Screen name="profile-menu" />
            <Stack.Screen name="help-centre" />

            {/* Onboarding */}
            <Stack.Screen name="onboarding-steps" />
            <Stack.Screen name="job-roles" />
            <Stack.Screen name="requirements" />
            <Stack.Screen name="resume-upload" />
            <Stack.Screen name="resume-review" />
            <Stack.Screen name="payment-method" />
            <Stack.Screen name="acknowledgement" />

          </Stack>
        </MessageNotificationsProvider>
      </RequirementsUploadProvider>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}