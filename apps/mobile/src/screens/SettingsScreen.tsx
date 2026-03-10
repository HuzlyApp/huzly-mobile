import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';

import { supabase } from '@/lib/config/supabase';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeColor } from '@/hooks/use-theme-color';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const DANGER = '#EF4444';
const DANGER_LIGHT = '#FEE2E2';

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Error logging out: ' + error.message);
      } else {
        // Clear session and return to welcome
        router.replace('/welcome');
      }
    } catch (err) {
      console.error('Logout exception:', err);
      alert('An error occurred while logging out');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG }]} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* User Info Section */}
        {session?.user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={[styles.infoBox, { borderBottomColor: BORDER }]}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{session.user.email}</Text>
            </View>
            {session.user.user_metadata?.full_name && (
              <View style={styles.infoBox}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{session.user.user_metadata.full_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Logout Section */}
        <View style={styles.section}>
          <Pressable
            style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={DANGER} />
            ) : (
              <>
                <AntDesign name="logout" size={18} color={DANGER} />
                <Text style={styles.logoutText}>Log Out</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: DANGER_LIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DANGER,
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: DANGER,
  },
});
