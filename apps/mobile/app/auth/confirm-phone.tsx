// apps/mobile/app/auth/confirm-phone.tsx

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendPhoneOtp } from '@/lib/auth/auth.service';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#4B5563';
const PRIMARY = '#4473C0';
const BORDER_SOFT = '#E5E7EB';

function formatPHDisplay(phoneE164: string) {
  const digits = phoneE164.replace(/\D/g, '');

  if (!digits.startsWith('63') || digits.length < 12) return phoneE164;

  const ten = digits.slice(2, 12);
  const a = ten.slice(0, 3);
  const b = ten.slice(3, 6);
  const c = ten.slice(6, 10);

  return `+63-${a}-${b}-${c}`;
}

export default function ConfirmPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; next?: string }>();

  const phoneE164 = useMemo(() => (params.phone ?? '').toString(), [params.phone]);
  const next = useMemo(() => (params.next ?? '').toString(), [params.next]);
  const phoneDisplay = useMemo(() => formatPHDisplay(phoneE164), [phoneE164]);

  const [sending, setSending] = useState(false);

  const onContact = () => {
    Alert.alert('Contact Us', 'Please email support@huzly.com for help.');
  };

  const onSend = async () => {
    if (!phoneE164) {
      Alert.alert('Missing phone', 'Please go back and enter your phone number.');
      return;
    }

    setSending(true);

    try {
      console.log('[CONFIRM-PHONE] phoneE164 param:', phoneE164);
      const { error } = await sendPhoneOtp({
        phone: phoneE164,
        role: 'Worker',
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      router.push({
        pathname: '/auth/otp',
        params: {
          phone: phoneE164,
          next,
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send OTP. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Please Confirm</Text>

          <Text style={styles.sub}>
            We will send you a One Time Passcode to{'\n'}
            <Text style={styles.phone}>{phoneDisplay}</Text>
          </Text>

          <Pressable
            onPress={onSend}
            disabled={sending}
            style={[styles.primaryBtn, sending && { opacity: 0.7 }]}
          >
            {sending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.primaryText}>Sending…</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>Send me the code</Text>
            )}
          </Pressable>

          <View style={styles.bottomRow}>
            <Text style={styles.small}>Not your mobile number?</Text>
            <Pressable onPress={onContact} hitSlop={8}>
              <Text style={styles.link}> Contact Us</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  phone: {
    color: TEXT_PRIMARY,
    fontWeight: '400',
  },
  primaryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  small: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  link: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
  },
});