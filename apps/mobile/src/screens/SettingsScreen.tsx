import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';

import { supabase } from '@/lib/config/supabase';
import { useMessageNotifications } from '@/contexts/MessageNotificationsContext';
import { useAuthSession } from '@/hooks/use-auth-session';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';
const DANGER = '#EF4444';
const DANGER_LIGHT = '#FEE2E2';
const TEAL = '#0D9488';

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const {
    preferences,
    setSoundEnabled,
    setVibrationEnabled,
    setBrowserNotificationsEnabled,
  } = useMessageNotifications();
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messages</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabels}>
              <Text style={styles.toggleTitle}>Message sounds</Text>
              <Text style={styles.toggleHint}>Play a sound for new incoming messages</Text>
            </View>
            <Switch
              value={preferences.soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: BORDER, true: '#99F6E4' }}
              thumbColor={preferences.soundEnabled ? TEAL : '#F3F4F6'}
            />
          </View>
          {Platform.OS === 'web' ? (
            <Text style={styles.webHint}>
              On web, tap anywhere in the app once so the browser allows notification audio.
            </Text>
          ) : null}
          <View style={[styles.toggleRow, styles.toggleRowBorder]}>
            <View style={styles.toggleLabels}>
              <Text style={styles.toggleTitle}>Vibration</Text>
              <Text style={styles.toggleHint}>Short buzz on new messages (mobile)</Text>
            </View>
            <Switch
              value={preferences.vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: BORDER, true: '#99F6E4' }}
              thumbColor={preferences.vibrationEnabled ? TEAL : '#F3F4F6'}
            />
          </View>
          {Platform.OS === 'web' && typeof Notification !== 'undefined' ? (
            <View style={[styles.toggleRow, styles.toggleRowBorder]}>
              <View style={styles.toggleLabels}>
                <Text style={styles.toggleTitle}>Browser notifications</Text>
                <Text style={styles.toggleHint}>When this tab is in the background</Text>
              </View>
              <Switch
                value={preferences.browserNotificationsEnabled}
                onValueChange={(v) => void setBrowserNotificationsEnabled(v)}
                trackColor={{ false: BORDER, true: '#99F6E4' }}
                thumbColor={preferences.browserNotificationsEnabled ? TEAL : '#F3F4F6'}
              />
            </View>
          ) : null}
        </View>

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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  toggleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  toggleLabels: {
    flex: 1,
    paddingRight: 8,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  toggleHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
    lineHeight: 16,
  },
  webHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    lineHeight: 16,
  },
});
