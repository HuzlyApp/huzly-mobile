/**
 * worker-signup-enhanced.tsx
 *
 * ENHANCED version with:
 *   - Profile verification after sign-up
 *   - Better error handling
 *   - Loading states
 *   - Improved UX feedback
 */

import { AntDesign, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signUpWithEmail, signUpWithPhone } from '@/lib/auth/auth.service';
import { getMyProfile } from '@/lib/auth/profile.service';

const BG = '#FFFFFF';
const BORDER = '#CBD5E1';
const BORDER_SOFT = '#E5E7EB';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#0F172A';
const PRIMARY = '#3B6FD8';
const PRIMARY_DARK = '#0062FF';
const WHITE = '#FFFFFF';
const ERROR = '#EF4444';

type Method = 'email' | 'phone';

export default function WorkerSignUpScreen() {
  const router = useRouter();

  const [method, setMethod] = useState<Method>('email');
  const [agreed, setAgreed] = useState(false);

  // email fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  // phone fields (digits only)
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);

  // async state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyingProfile, setVerifyingProfile] = useState(false);

  // US only
  const country = useMemo(() => ({ dial: '+1' }), []);

  const onlyDigits = (s: string) => s.replace(/\D/g, '');

  const formatLocalUS = (digits: string) => {
    const d = digits.slice(0, 10);
    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);
    if (d.length === 0) return '';
    if (d.length <= 3) return `${a}`;
    if (d.length <= 6) return `${a}-${b}`;
    return `${a}-${b}-${c}`;
  };

  const handlePhoneChange = (text: string) => {
    const digits = onlyDigits(text).slice(0, 10);
    setPhoneDigits(digits);
  };

  const onCancel = () => router.back();

  // ⭐ Verify profile was created before navigating
  const verifyProfileAndNavigate = async (redirectTo: string = '/onboarding-steps') => {
    setVerifyingProfile(true);
    try {
      const { data: profile, error } = await getMyProfile();

      if (error || !profile) {
        setErrorMsg('Profile creation failed. Please try again or contact support.');
        return false;
      }

      // Success: profile verified
      router.replace(redirectTo);
      return true;
    } catch (err) {
      console.error('[signup] Profile verification error:', err);
      setErrorMsg('Could not verify profile. Please try again.');
      return false;
    } finally {
      setVerifyingProfile(false);
    }
  };

  const onPrimary = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (method === 'phone') {
        const phoneE164 = `+1${phoneDigits}`;
        const { error } = await signUpWithPhone({ phone: phoneE164, role: 'worker' });
        if (error) {
          setErrorMsg(error);
          return;
        }
        // OTP sent — go to confirm-phone screen
        router.push(
          `/auth/confirm-phone?phone=${encodeURIComponent(phoneE164)}&next=${encodeURIComponent('/onboarding-steps')}`
        );
        return;
      }

      // ── Email sign-up ───────────────────────────────────────
      const { data, error } = await signUpWithEmail({
        email,
        password: pw,
        fullName,
        role: 'worker',
      });

      if (error) {
        setErrorMsg(error);
        return;
      }

      if (data?.needsEmailConfirm) {
        // Email confirmation required — show pending screen
        router.push(
          `/auth/confirm-email?email=${encodeURIComponent(
            email.trim().toLowerCase()
          )}&next=${encodeURIComponent('/onboarding-steps')}`
        );
      } else {
        // Email confirmation disabled — user is signed in immediately
        // ⭐ Verify profile was created before proceeding
        const success = await verifyProfileAndNavigate('/onboarding-steps');
        if (!success) {
          // Error already set by verifyProfileAndNavigate
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onSignInLink = () => router.push('/auth/worker-signin');

  function SocialCircle({ children }: { children: ReactNode }) {
    return <Pressable style={styles.socialCircle}>{children}</Pressable>;
  }

  const canSubmit = useMemo(() => {
    if (loading || verifyingProfile) return false;
    if (!agreed) return false;
    if (method === 'phone') return phoneDigits.trim().length === 10;
    return (
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      pw.length >= 8 &&
      pw === pw2
    );
  }, [method, phoneDigits, agreed, fullName, email, pw, pw2, loading, verifyingProfile]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/logos/Huzly-logo.svg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.h1}>Sign Up</Text>

          {/* Email / Phone toggle */}
          <View style={styles.segmentOuter}>
            <View style={styles.segmentInner}>
              <Pressable
                onPress={() => {
                  setMethod('email');
                  setErrorMsg(null);
                }}
                style={[
                  styles.segmentBtn,
                  method === 'email' && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    method === 'email' && styles.segmentTextActive,
                  ]}
                >
                  Email
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMethod('phone');
                  setErrorMsg(null);
                }}
                style={[
                  styles.segmentBtn,
                  method === 'phone' && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    method === 'phone' && styles.segmentTextActive,
                  ]}
                >
                  Phone
                </Text>
              </Pressable>
            </View>
          </View>

          {/* FORM */}
          {method === 'email' ? (
            <View style={styles.form}>
              <Field
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                autoCapitalize="words"
                editable={!loading && !verifyingProfile}
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading && !verifyingProfile}
              />
              <Field
                label="Create password"
                value={pw}
                onChangeText={setPw}
                placeholder="Min. 8 characters"
                secureTextEntry
                editable={!loading && !verifyingProfile}
              />
              <Field
                label="Verify password"
                value={pw2}
                onChangeText={setPw2}
                placeholder="Confirm password"
                secureTextEntry
                editable={!loading && !verifyingProfile}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Enter Phone Number</Text>
              <View style={[styles.phoneRow, phoneFocused && styles.phoneRowFocused]}>
                <View style={styles.flagSegment}>
                  <Image
                    source={require('@/assets/images/flagImage.png')}
                    style={styles.flagImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.phoneDivider} />
                <View style={styles.inputSegment}>
                  <Text style={styles.dialText}>{country.dial}-</Text>
                  <TextInput
                    value={formatLocalUS(phoneDigits)}
                    onChangeText={handlePhoneChange}
                    placeholder="___-___-____"
                    placeholderTextColor="#94A3B8"
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                    inputMode="numeric"
                    textContentType="telephoneNumber"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    editable={!loading && !verifyingProfile}
                    style={[
                      styles.phoneInput,
                      Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Error banner */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Loading indicator */}
          {verifyingProfile && (
            <View style={styles.verifyingBox}>
              <ActivityIndicator color={PRIMARY} size="small" />
              <Text style={styles.verifyingText}>Verifying profile…</Text>
            </View>
          )}

          {/* Terms checkbox */}
          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={styles.checkRow}
            hitSlop={8}
            disabled={loading || verifyingProfile}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkText}>
              I hereby confirm that I have read and agree with the{' '}
              <Text style={styles.linkBold}>Terms &amp; Conditions</Text> and{' '}
              <Text style={styles.linkBold}>Privacy Policy</Text>
            </Text>
          </Pressable>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={loading || verifyingProfile}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
              onPress={onPrimary}
              disabled={!canSubmit}
            >
              {loading || verifyingProfile ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.primaryText}>Sign Up</Text>
              )}
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social */}
          <View style={styles.socialRow}>
            <SocialCircle>
              <FontAwesome name="facebook" size={22} color="#1877F2" />
            </SocialCircle>
            <SocialCircle>
              <AntDesign name="google" size={22} color="#DB4437" />
            </SocialCircle>
            <SocialCircle>
              <AntDesign name="apple" size={22} color="#000" />
            </SocialCircle>
          </View>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>
              Already have an account?{' '}
              <Text style={styles.bottomLink} onPress={onSignInLink}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoWrap: {
    height: 60,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  segmentOuter: {
    marginBottom: 20,
  },
  segmentInner: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: BORDER_SOFT,
  },
  segmentBtnActive: {
    backgroundColor: PRIMARY,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  segmentTextActive: {
    color: WHITE,
  },
  form: {
    marginBottom: 20,
  },
  fieldWrap: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: '#FAFAFA',
  },
  phoneRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  phoneRowFocused: {
    borderColor: PRIMARY,
  },
  flagSegment: {
    width: 56,
    height: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BORDER_SOFT,
  },
  flagImage: {
    width: 24,
    height: 24,
  },
  phoneDivider: {
    width: 1,
    backgroundColor: BORDER,
  },
  inputSegment: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dialText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  phoneInput: {
    flex: 1,
    marginLeft: 4,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: ERROR,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#8B1D1D',
  },
  verifyingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  verifyingText: {
    fontSize: 13,
    color: PRIMARY,
    marginLeft: 8,
    fontWeight: '500',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '800',
    color: WHITE,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  linkBold: {
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  primaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER_SOFT,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  bottomRow: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  bottomText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  bottomLink: {
    fontWeight: '700',
    color: PRIMARY,
  },
});
