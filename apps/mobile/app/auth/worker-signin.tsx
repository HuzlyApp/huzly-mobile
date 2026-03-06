import { AntDesign, FontAwesome, Ionicons } from '@expo/vector-icons';
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

export default function WorkerSignInScreen() {
  const router = useRouter();

  const [method, setMethod] = useState<Method>('phone');

  // email
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // phone (store digits only)
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  // focus (optional, but nice)
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

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
  if (method === 'phone') {
    if (phoneDigits.length !== 10) return;
    router.push('/messaging');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  router.push('/messaging');
};

  const onForgot = () => {
    // TODO: route to forgot password screen
    // eslint-disable-next-line no-console
    console.log('forgot password');
  };

  const onSignUpLink = () => {
    router.push('/auth/worker-signup');
  };

  function SocialCircle({ children }: { children: ReactNode }) {
    return <Pressable style={styles.socialCircle}>{children}</Pressable>;
  }

  const canSubmit = useMemo(() => {
    if (method === 'phone') return phoneDigits.trim().length === 10 && agreed;
    return email.trim().length > 0 && pw.length >= 6;
  }, [method, phoneDigits, agreed, email, pw]);

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

          <Text style={styles.h1}>Log In</Text>

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
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>

                <View
                  style={[
                    styles.passwordWrap,
                    pwFocused && styles.inputFocused,
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                >
                  <TextInput
                    value={pw}
                    onChangeText={setPw}
                    placeholder="Password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPw}
                    style={[styles.input, styles.passwordInput, { borderWidth: 0 }]}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.rowBetween}>
                <Pressable onPress={() => setRemember((v) => !v)} style={styles.rememberRow} hitSlop={8}>
                  <View style={[styles.checkboxSmall, remember && styles.checkboxChecked]}>
                    {remember ? <Text style={styles.checkmarkSmall}>✓</Text> : null}
                  </View>
                  <Text style={styles.rememberText}>Remember Me</Text>
                </Pressable>

                <Pressable onPress={onForgot} hitSlop={8}>
                  <Text style={styles.linkBlue}>Forgot Password?</Text>
                </Pressable>
              </View>
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
            </View>
          )}

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
              <Text style={styles.primaryText}>Log In</Text>
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
              Don’t have an Account?{' '}
              <Text style={styles.bottomLink} onPress={onSignUpLink}>
                Sign Up
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
  const [focused, setFocused] = useState(false);

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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
    marginTop: 8,
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

  inputFocused: {
    borderColor: PRIMARY,
    borderWidth: 1.5,
    shadowColor: PRIMARY,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  passwordWrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: WHITE,
    overflow: 'hidden',
  },
  passwordInput: { paddingRight: 44, borderWidth: 0 },
  eyeBtn: { position: 'absolute', right: 12, top: 12, padding: 4 },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { fontSize: 12, color: TEXT_SECONDARY },

  linkBlue: { color: PRIMARY_DARK, fontWeight: '600', fontSize: 12 },

  // US phone input (matches your screenshot)
  phoneRow: {
    height: 50,
    borderRadius: 10,
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
  checkboxSmall: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  checkboxChecked: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  checkmark: { color: WHITE, fontSize: 12, fontWeight: '900', marginTop: -1 },
  checkmarkSmall: { color: WHITE, fontSize: 12, fontWeight: '900', marginTop: -1 },
  checkText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
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
  primaryBtnDisabled: { opacity: 0.55 },
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