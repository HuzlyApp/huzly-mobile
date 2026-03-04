import { AntDesign, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import {
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

const BG = '#FFFFFF';
const BORDER = '#CBD5E1';
const BORDER_SOFT = '#E5E7EB';

const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#0F172A';
const PRIMARY = '#3B6FD8';
const PRIMARY_DARK = '#0062FF';
const WHITE = '#FFFFFF';

type Method = 'email' | 'phone';

export default function WorkerSignUpScreen() {
  const router = useRouter();

  const [method, setMethod] = useState<Method>('email');
  const [agreed, setAgreed] = useState(false);

  // email
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  // phone (digits only)
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [phone, setPhone] = useState('');

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

  const onPrimary = () => {
    const next = '/onboarding-steps'
  
    if (method === 'phone') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) return;
  
      const to = `+1${digits}`;
      router.push(
        `/auth/confirm-phone?channel=phone&to=${encodeURIComponent(to)}&next=${encodeURIComponent(next)}`
      );
      return;
    }
  
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
  
    router.push(
      `/auth/confirm-email?channel=email&to=${encodeURIComponent(normalizedEmail)}&next=${encodeURIComponent(next)}`
    );
  };

  const onSignInLink = () => {
    // route to sign-in if you have it
    // router.push('/auth/worker-signin');
  };

  function SocialCircle({ children }: { children: ReactNode }) {
    return <Pressable style={styles.socialCircle}>{children}</Pressable>;
  }

  const canSubmit = useMemo(() => {
    if (method === 'phone') return phoneDigits.trim().length === 10 && agreed;
    return agreed && fullName.trim().length > 0 && email.trim().length > 0 && pw.length >= 6 && pw === pw2;
  }, [method, phoneDigits, agreed, fullName, email, pw, pw2]);

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
          <View style={styles.container}>
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
                onPress={() => setMethod('email')}
                style={[styles.segmentBtn, method === 'email' && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, method === 'email' && styles.segmentTextActive]}>
                  Email
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMethod('phone')}
                style={[styles.segmentBtn, method === 'phone' && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, method === 'phone' && styles.segmentTextActive]}>
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
              />

              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Field
                label="Create password"
                value={pw}
                onChangeText={setPw}
                placeholder="Password"
                secureTextEntry
              />

              <Field
                label="Verify password"
                value={pw2}
                onChangeText={setPw2}
                placeholder="Password"
                secureTextEntry
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Enter Phone Number</Text>

              <View style={[styles.phoneRow, phoneFocused && styles.phoneRowFocused]}>
                {/* Left flag segment */}
                <View style={styles.flagSegment}>
                  <Image
                    source={require('@/assets/images/flagImage.png')}
                    style={styles.flagImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Divider */}
                <View style={styles.phoneDivider} />

                {/* Input segment */}
                <View style={styles.inputSegment}>
                  <Text style={styles.dialText}>{country.dial}-</Text>
                  <TextInput
                    value={formatLocalUS(phoneDigits)}
                    onChangeText={handlePhoneChange}
                    placeholder="___-___-____"
                    placeholderTextColor="#94A3B8"
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                    inputMode="numeric" // web
                    textContentType="telephoneNumber"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    style={[
                      styles.phoneInput,
                      Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Checkbox */}
          <Pressable onPress={() => setAgreed((v) => !v)} style={styles.checkRow} hitSlop={8}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>

            <Text style={styles.checkText}>
              I hereby confirm that I have read and agree with the{' '}
              <Text style={styles.linkBold}>Terms &amp; Conditions</Text> and{' '}
              <Text style={styles.linkBold}>Privacy Policy</Text>
            </Text>
          </Pressable>

          {/* Buttons row */}
          <View style={styles.btnRow}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
              onPress={onPrimary}
              disabled={!canSubmit}
            >
              <Text style={styles.primaryText}>Sign Up</Text>
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

/** Reusable Field */
function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        secureTextEntry={props.secureTextEntry}
        style={[
          styles.input,
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 107,
    height: 41,
    marginBottom: 20,
    marginTop: 20,
  },
  h1: {
    fontSize: 24,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },

  segmentOuter: { marginTop: 16 },
  segmentInner: {
    flexDirection: 'row',
    backgroundColor: '#EAF0FB',
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: WHITE },
  segmentText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  segmentTextActive: { color: TEXT_PRIMARY },

  form: { marginTop: 14 },
  field: { marginTop: 10 },
  label: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: '600' },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },

  // NEW phone input (same as your sign-in)
  phoneRow: {
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#AABEE1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  phoneRowFocused: {
    borderColor: PRIMARY,
  },
  flagSegment: {
    width: 60,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  flagImage: {
    width: 24,
    height: 16,
  },
  phoneDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#AABEE1',
  },
  inputSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dialText: {
    fontSize: 16,
    fontWeight: '400',
    color: TEXT_SECONDARY,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '400',
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: WHITE,
  },
  checkboxChecked: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  checkmark: { color: WHITE, fontSize: 12, fontWeight: '900', marginTop: -1 },
  checkText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400 as any,
    color: TEXT_SECONDARY,
  },
  linkBold: { color: TEXT_PRIMARY, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  cancelText: { color: TEXT_PRIMARY, fontWeight: '600', fontSize: 14 },

  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryText: { color: WHITE, fontWeight: '600', fontSize: 14 },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER_SOFT },
  dividerText: { marginHorizontal: 10, fontSize: 11, color: '#94A3B8' },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  socialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },

  bottomRow: { marginTop: 16, alignItems: 'center' },
  bottomText: { fontSize: 14, color: TEXT_SECONDARY },
  bottomLink: { color: PRIMARY_DARK, fontWeight: '600' },
});