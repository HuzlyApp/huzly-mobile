import { Stack } from 'expo-router';
import React from 'react';

export default function ShiftStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
