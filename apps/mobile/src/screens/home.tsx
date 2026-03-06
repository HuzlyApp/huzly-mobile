import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG = '#F3F4F6';
const PRIMARY = '#2F6BFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#4473C0';
const WHITE = '#FFFFFF';

export default function HomeScreen() {
  const router = useRouter();

  const onContinue = () => {
    // TODO: change destination as needed
    router.push('/welcome');
  };

  const onSkip = () => {
    router.push('/auth');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Background image (faded) */}
        <Image
          // TODO: replace with your real background image
          // Put an image at: apps/mobile/src/assets/images/worker-bg.jpg (example)
          source={require('@/assets/images/worker-bg.jpg')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.bgOverlay} />

        {/* Content */}
        <View style={styles.content}>
  
          {/* TOP CENTER CONTENT */}
          <View style={styles.centerContent}>
            <LinearGradient
              colors={['#2F6BFF', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCard}
            >
            <Image
              source={require('@/assets/images/worker-profile.png')}
              style={styles.iconImage}
              resizeMode="contain"
            />
            </LinearGradient>

            <Text style={styles.title}>Apply as Worker</Text>

            <Text style={styles.subtitle}>
              Empowering skilled workers to connect, {'\n'}
              earn, and grow through smarter job {'\n'}
              matching.
            </Text>
          </View>

        {/* BOTTOM SECTION */}
          <View style={styles.bottomSection}>
          <View style={styles.buttons}>
            <Pressable style={styles.primaryBtn} onPress={onContinue}>
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={onSkip}>
              <Text style={styles.secondaryText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            {/* <View style={styles.dot} /> */}
          </View>
        </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28, // faded like screenshot
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    opacity: 0.65,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  iconCard: {
    width: 64,
    height: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 14,
  },

  iconImage: {
    width: 46,
    height: 55,
    tintColor: WHITE,
  },

  title: {
    fontSize: 30,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 18,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 30,
  },

  buttons: {
    width: '100%',
    marginTop: 12,
  },

  centerContent: {
    alignItems: 'center',
    marginTop: 80,
  },

  bottomSection: {
    paddingBottom: 30,
  },

  primaryBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryText: { color: WHITE, fontWeight: '700', fontSize: 14 },

  secondaryBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: 14 },

  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 22,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: PRIMARY,
  },
});