import { Stack } from 'expo-router';
import React from 'react';

export default function MessagingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="chat"
        options={{
          animationEnabled: true,
        }}
      />
    </Stack>
  );
}
