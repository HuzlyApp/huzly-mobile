import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#F3F4F6';

export default function AppLoadingScreen() {
  useEffect(() => {
    const boot = async () => {
      // TODO: Replace with real checks later:
      // - restore supabase session
      // - fetch profile
      // - check onboarding status
      await new Promise((r) => setTimeout(r, 900));

      // Main app screen
      router.replace('/(tabs)');
    };

    boot();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('@/assets/logos/Huzly-logo.svg')}
          style={styles.logo}
          resizeMode="contain"
        />

        <ActivityIndicator size="small" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 80,
    marginBottom: 80,
  },
});