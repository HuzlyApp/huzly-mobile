import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#FFFFFF';
const CARD = '#F3F6FB';
const BORDER = '#CBD5E1';
const BORDER_SOFT = '#E5E7EB';

const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const PRIMARY = '#3B6FD8';
const PRIMARY_DARK = '#2F5FC0';
const WHITE = '#FFFFFF';

type Method = 'email' | 'phone';

export default function WorkerSignUpScreen() {
  const router = useRouter();

  const [method, setMethod] = useState<Method>('email');
  const [agreed, setAgreed] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const [phone, setPhone] = useState('');
  const country = useMemo(() => ({ flag: '🇺🇸', dial: '+1' }), []);

  const onCancel = () => router.back();

  const onSignUp = () => {
    // TODO: hook up Supabase/OTP etc.
    // Validate agreed + required fields here
    console.log('signup', { method, fullName, email, phone, agreed });
  };

  const onSignInLink = () => {
    // If you have sign-in screen route:
    // router.replace('/auth'); // or router.push('/auth/worker-signin')
  };

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
            <Text style={styles.logoText}>Huzly</Text>
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
              <View style={styles.phoneRow}>
                <View style={styles.flagBox}>
                  <Text style={styles.flag}>{country.flag}</Text>
                </View>
                <Text style={styles.dial}>{country.dial}</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="800 555 0199"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
            </View>
          )}

          {/* Checkbox */}
          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={styles.checkRow}
            hitSlop={8}
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

          {/* Buttons row */}
          <View style={styles.btnRow}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryBtn, (!agreed || (method === 'email' && !email)) && styles.primaryBtnDisabled]}
              onPress={onSignUp}
              disabled={!agreed}
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
            <SocialCircle label="f" />
            <SocialCircle label="G" />
            <SocialCircle label="" />
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
        style={styles.input}
      />
    </View>
  );
}

function SocialCircle({ label }: { label: string }) {
  return (
    <Pressable style={styles.socialBtn}>
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
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

  logoWrap: { alignItems: 'center', marginTop: 6 },
  logoText: { fontSize: 28, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: 0.3 },

  h1: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '800',
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

  phoneRow: {
    height: 42,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  flagBox: {
    width: 34,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: WHITE,
  },
  flag: { fontSize: 14 },
  dial: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '700', marginRight: 8 },
  phoneInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: TEXT_PRIMARY,
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
    fontSize: 11,
    lineHeight: 16,
    color: TEXT_SECONDARY,
  },
  linkBold: { color: TEXT_PRIMARY, fontWeight: '800' },

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
  cancelText: { color: TEXT_PRIMARY, fontWeight: '800', fontSize: 12 },

  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryText: { color: WHITE, fontWeight: '800', fontSize: 12 },

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
  socialBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },

  bottomRow: { marginTop: 16, alignItems: 'center' },
  bottomText: { fontSize: 11, color: TEXT_SECONDARY },
  bottomLink: { color: PRIMARY_DARK, fontWeight: '800' },
});