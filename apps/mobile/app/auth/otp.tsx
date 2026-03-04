import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const PRIMARY = '#3B6FD8';
const BORDER_SOFT = '#E5E7EB';

function formatUSPhoneE164ToDisplay(phoneE164: string) {
  const digits = phoneE164.replace(/\D/g, '');
  const ten = digits.length >= 11 ? digits.slice(1, 11) : digits.slice(0, 10);
  const a = ten.slice(0, 3);
  const b = ten.slice(3, 6);
  const c = ten.slice(6, 10);
  if (ten.length < 10) return phoneE164;
  return `+1-${a}-${b}-${c}`;
}

export default function ConfirmPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; next?: string }>();

  const phoneE164 = useMemo(() => {
    const raw = params.phone ?? '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (raw.startsWith('+')) return raw;
    return raw;
  }, [params.phone]);

  const phoneDisplay = useMemo(() => formatUSPhoneE164ToDisplay(phoneE164), [phoneE164]);

  const [sending, setSending] = useState(false);

  const onCancel = () => router.back();

  const onContact = () => {
    Alert.alert('Contact Us', 'TODO: Route to support or open email.');
  };

  const onSend = async () => {
    if (!phoneE164) {
      Alert.alert('Missing phone', 'Please go back and enter your phone number.');
      return;
    }

    setSending(true);
    try {
      // TODO: send OTP (Supabase/backend)
      await new Promise((r) => setTimeout(r, 600));

      router.push({
        pathname: '/auth/otp',
        params: { phone: phoneE164, next: params.next ?? '' },
      });
    } catch {
      Alert.alert('Error', 'Failed to send OTP. Try again.');
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator />
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

          <Pressable onPress={onCancel} hitSlop={8} style={{ marginTop: 10 }}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 18,
    backgroundColor: '#fff',
  },
  title: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  sub: { marginTop: 8, fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  phone: { color: TEXT_PRIMARY, fontWeight: '800' },
  primaryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  bottomRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
  small: { fontSize: 12, color: TEXT_SECONDARY },
  link: { fontSize: 12, color: PRIMARY, fontWeight: '800' },
  cancelLink: { textAlign: 'center', color: TEXT_SECONDARY, fontWeight: '700' },
});