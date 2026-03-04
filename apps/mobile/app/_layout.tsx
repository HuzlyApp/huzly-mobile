import { RequirementsUploadProvider } from '@/stores/RequirementsUploadContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // ⚠️  Mount onAuthStateChange HERE, exactly once, at the root.
  const { session, loading } = useAuthSession();

  useEffect(() => {
    if (loading) return; // wait for session to be resolved
    SplashScreen.hideAsync();

    if (session) {
      // Authenticated — go to main app.
      // Replace 'onboarding-steps' check with a profile.onboarding_complete
      // check if you want to gate incomplete users.
      router.replace('/(tabs)');
    } else {
      // Not authenticated — show welcome/auth flow.
      router.replace('/welcome');
    }
  }, [session, loading]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RequirementsUploadProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Public / pre-auth */}
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />

          {/* Main app tabs */}
          <Stack.Screen name="(tabs)" />

          {/* Onboarding screens */}
          <Stack.Screen name="onboarding-steps" />
          <Stack.Screen name="job-roles" />
          <Stack.Screen name="requirements" />
          <Stack.Screen name="acknowledgement" />
          <Stack.Screen name="payment-method" />
        </Stack>
      </RequirementsUploadProvider>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
