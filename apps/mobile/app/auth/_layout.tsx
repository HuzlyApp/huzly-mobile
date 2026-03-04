import { Stack } from 'expo-router';

/**
 * Layout for auth routes (email verification, OTP, sign-in, sign-up, etc.)
 *
 * Provides proper navigation stack for nested auth screens.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="worker-signup" />
      <Stack.Screen name="worker-signup-enhanced" />
      <Stack.Screen name="worker-signin" />
      <Stack.Screen name="confirm-email" />
      <Stack.Screen name="confirm-phone" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
