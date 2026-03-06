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
      segments[0] === 'job-roles' ||
      segments[0] === 'requirements' ||
      segments[0] === 'payment-method' ||
      segments[0] === 'acknowledgement';

    /**
     * If user is already inside auth / welcome / onboarding
     * DO NOT override navigation.
     */

    if (inPublicFlow) return;

    /**
     * If user has session → go to main app
     */

    if (session) {
      router.replace('/(tabs)');
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
        <Stack screenOptions={{ headerShown: false }}>

          {/* Public */}
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />

          {/* Main App */}
          <Stack.Screen name="(tabs)" />

          {/* Onboarding */}
          <Stack.Screen name="onboarding-steps" />
          <Stack.Screen name="job-roles" />
          <Stack.Screen name="requirements" />
          <Stack.Screen name="payment-method" />
          <Stack.Screen name="acknowledgement" />

        </Stack>
      </RequirementsUploadProvider>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}