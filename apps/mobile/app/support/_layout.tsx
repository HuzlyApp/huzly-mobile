import { Stack } from 'expo-router';
import React from 'react';

export default function SupportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="success" />
      <Stack.Screen name="ticket/[id]" />
    </Stack>
  );
}
