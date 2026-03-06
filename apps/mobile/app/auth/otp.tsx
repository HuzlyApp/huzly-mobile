// apps/mobile/app/auth/otp.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resendOtp, verifyEmailOtp, verifyPhoneOtp } from '@/lib/auth/auth.service';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#D1D5DB';
const PRIMARY = '#3B6FD8';
const DISABLED_BG = '#E5E7EB';
const BOX_BG = '#FFFFFF';
const BOX_BG_DISABLED = '#F3F4F6';

const OTP_LEN = 6;
const OTP_EXPIRY = 300; // 5 minutes
const OTP_TIMER_KEY = "otp_timer_expiry";

function maskPhone(phoneE164: string) {
  const digits = phoneE164.replace(/\D/g, '');
  const ten = digits.startsWith('63') ? digits.slice(2, 12) : digits.slice(-10);

  if (ten.length !== 10) return phoneE164;

  const a = ten.slice(0, 3);
  const b = ten.slice(3, 6);
  const c = ten.slice(6, 10);

  return `+63-${a}-***-${c}`;
}

function maskEmail(email: string) {
  const trimmed = email.trim();
  const [name, domain] = trimmed.split('@');

  if (!name || !domain) return trimmed;

  const shown = name.slice(0, 2);
  return `${shown}***@${domain}`;
}

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone?: string;
    email?: string;
    next?: string;
  }>();

  const mode = useMemo<'phone' | 'email'>(() => {
    return params.email ? 'email' : 'phone';
  }, [params.email]);

  const phone = (params.phone ?? '').toString();
  const email = (params.email ?? '').toString();
  const next = (params.next ?? '').toString();

  const subtitle = useMemo(() => {
    if (mode === 'phone') {
      return {
        line1: `We’ve sent you the OTP on this Mobile Number`,
        target: maskPhone(phone),
        timerPrefix: '',
      };
    }

    return {
      line1: `We’ve sent you the verification code on this email.`,
      target: maskEmail(email),
      timerPrefix: 'Get Code in ',
    };
  }, [mode, phone, email]);

  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: OTP_LEN }, () => '')
  );
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputsRef = useRef<Array<TextInput | null>>([]);

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LEN && !digits.includes('');
  const canVerify = isComplete && !verifying;

  const focusIndex = (index: number) => {
    inputsRef.current[index]?.focus?.();
  };

  const blurAll = () => {
    inputsRef.current.forEach((input) => input?.blur?.());
    Keyboard.dismiss();
  };

  useEffect(() => {

  const initTimer = async () => {

    const savedExpiry = await AsyncStorage.getItem(OTP_TIMER_KEY);

    const now = Date.now();

    if (savedExpiry) {

      const remaining = Math.floor((parseInt(savedExpiry) - now) / 1000);

      if (remaining > 0) {
        setSecondsLeft(remaining);
        return;
      }

    }

    const newExpiry = now + OTP_EXPIRY * 1000;

    await AsyncStorage.setItem(
      OTP_TIMER_KEY,
      newExpiry.toString()
    );

    setSecondsLeft(OTP_EXPIRY);

  };

  initTimer();

}, [mode, phone, email]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    const timer = setTimeout(() => focusIndex(0), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isComplete) {
      blurAll();
    }
  }, [isComplete]);

  const fillFromIndex = (startIndex: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;

    const nextDigits = [...digits];
    let writeAt = startIndex;

    for (let i = 0; i < clean.length && writeAt < OTP_LEN; i++, writeAt++) {
      nextDigits[writeAt] = clean[i];
    }

    setDigits(nextDigits);

    const nextEmpty = nextDigits.findIndex((digit) => digit === '');
    if (nextEmpty === -1) {
      blurAll();
    } else {
      focusIndex(nextEmpty);
    }
  };

  const handleChange = (index: number, text: string) => {
    setError(null);

    const clean = text.replace(/\D/g, '');

    if (clean === '') {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    if (clean.length > 1) {
      fillFromIndex(index, clean);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = clean[0];
    setDigits(nextDigits);

    if (index < OTP_LEN - 1) {
      focusIndex(index + 1);
    } else {
      blurAll();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') return;

    if (digits[index] === '' && index > 0) {
      const nextDigits = [...digits];
      nextDigits[index - 1] = '';
      setDigits(nextDigits);
      focusIndex(index - 1);
    }
  };

  const onResend = async () => {
    if (secondsLeft > 0 || resending) return;

    setError(null);
    setResending(true);

    try {
      const { error } = await resendOtp({
        phone: mode === 'phone' ? phone : undefined,
        email: mode === 'email' ? email : undefined,
        role: 'Worker',
      });

      if (error) {
        setError(error);
        return;
      }

      setDigits(Array.from({ length: OTP_LEN }, () => ''));
      const newExpiry = Date.now() + OTP_EXPIRY * 1000;

      await AsyncStorage.setItem(
        OTP_TIMER_KEY,
        newExpiry.toString()
      );

      setSecondsLeft(OTP_EXPIRY);

      setTimeout(() => {
        focusIndex(0);
      }, 150);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const onCancel = () => {
    router.back();
  };

  const onVerify = async () => {
    setError(null);
    setVerifying(true);

    try {
      if (!isComplete) {
        setError('Please enter the 6-digit code.');
        return;
      }

      if (mode === 'phone') {
        const { error } = await verifyPhoneOtp(phone, otp);
        if (error) throw new Error(error);
      } else {
        const { error } = await verifyEmailOtp(email, otp);
        if (error) throw new Error(error);
      }

      await AsyncStorage.removeItem(OTP_TIMER_KEY);
      router.replace('/onboarding-steps');
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const timerText = useMemo(() => {

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const formatted =
    `${minutes}:${String(seconds).padStart(2, '0')}`;

  if (mode === 'email') {
    return `${subtitle.timerPrefix}${formatted}`;
  }

  return formatted;

}, [secondsLeft, mode, subtitle.timerPrefix]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Enter Code</Text>

        <Text style={styles.sub}>
          {subtitle.line1}
          {'\n'}
          <Text style={styles.target}>{subtitle.target}</Text>
        </Text>

        <Text style={styles.label}>Enter 6 digit OTP</Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputsRef.current[index] = ref;
              }}
              value={digit}
              onChangeText={(text) => handleChange(index, text)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              inputMode="numeric"
              maxLength={Platform.OS === 'ios' ? 1 : 6}
              textContentType="oneTimeCode"
              autoComplete={mode === 'phone' ? 'sms-otp' : 'one-time-code'}
              returnKeyType="done"
              selectionColor={PRIMARY}
              style={[
                styles.otpBox,
                isComplete && { backgroundColor: BOX_BG_DISABLED },
              ]}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.timerRow}>
          <Text style={styles.timer}>{timerText}</Text>

          <Pressable onPress={onResend} disabled={secondsLeft > 0 || resending} hitSlop={8}>
            <Text style={[styles.resend, (secondsLeft > 0 || resending) && { opacity: 0.4 }]}>
              {resending ? 'Resending…' : 'Resend'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={onCancel}
            disabled={verifying}
          >
            <Text style={styles.btnGhostText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[
              styles.btn,
              styles.btnPrimary,
              !canVerify && { backgroundColor: DISABLED_BG },
            ]}
            onPress={onVerify}
            disabled={!canVerify}
          >
            {verifying ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.btnPrimaryText}>Verifying…</Text>
              </View>
            ) : (
              <Text style={styles.btnPrimaryText}>Verify Code</Text>
            )}
          </Pressable>
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
    paddingTop: 28,
  },

  title: {
    fontSize: 30,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 18,
    color: TEXT_SECONDARY,
  },
  target: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },

  label: {
    marginTop: 18,
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },

  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  otpBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    backgroundColor: BOX_BG,
  },

  error: {
    marginTop: 10,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },

  timerRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    alignItems: 'center',
  },
  timer: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  resend: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '600',
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btnGhostText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },

  btnPrimary: {
    backgroundColor: PRIMARY,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});