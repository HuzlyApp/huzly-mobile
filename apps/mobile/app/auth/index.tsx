import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#F3F4F6';
const PRIMARY = '#2F6BFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const WHITE = '#FFFFFF';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  const handleWorker = () => {
    if (mode === 'signup') {
      router.push('/auth/worker-signup');
    } else {
      router.push('/auth/worker-signin');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <Text style={styles.logo}>Huzly</Text>

        {/* Segmented Control */}
        <View style={styles.segmentWrapper}>
          <Pressable
            style={[styles.segmentButton, mode === 'signup' && styles.segmentActive]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
              Sign Up
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentButton, mode === 'signin' && styles.segmentActive]}
            onPress={() => setMode('signin')}
          >
            <Text style={[styles.segmentText, mode === 'signin' && styles.segmentTextActive]}>
              Sign In
            </Text>
          </Pressable>
        </View>

        {/* Worker Card */}
        <View style={styles.cardContainer}>
          <Pressable style={styles.card} onPress={handleWorker}>
            <Text style={styles.cardText}>
              {mode === 'signup' ? 'Sign-up as Worker' : 'Sign-in as Worker'}
            </Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerWrapper}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.line} />
        </View>

        {/* Social Buttons (UI only) */}
        <View style={styles.socialRow}>
          <View style={styles.socialCircle}>
            <Text>f</Text>
          </View>
          <View style={styles.socialCircle}>
            <Text>G</Text>
          </View>
          <View style={styles.socialCircle}>
            <Text></Text>
          </View>
        </View>

        {/* Bottom Switch */}
        <View style={styles.bottomTextWrapper}>
          {mode === 'signup' ? (
            <Text style={styles.bottomText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => setMode('signin')}>
                Sign In
              </Text>
            </Text>
          ) : (
            <Text style={styles.bottomText}>
              Don’t have an account?{' '}
              <Text style={styles.link} onPress={() => setMode('signup')}>
                Sign Up
              </Text>
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    alignSelf: 'center',
    marginBottom: 30,
  },

  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },

  segmentActive: {
    backgroundColor: WHITE,
  },

  segmentText: {
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },

  segmentTextActive: {
    color: TEXT_PRIMARY,
  },

  cardContainer: {
    gap: 14,
  },

  card: {
    backgroundColor: WHITE,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },

  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  dividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 20,
  },

  socialCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  bottomTextWrapper: {
    marginTop: 30,
    alignItems: 'center',
  },

  bottomText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  link: {
    color: PRIMARY,
    fontWeight: '600',
  },
});