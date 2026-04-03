import { Stack } from 'expo-router';
import React from 'react';

/**
 * Main app shell: stack only (no Expo tab bar). Navigation is the custom BottomNav.
 */
export default function MainShellLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
