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

export default function WelcomeScreen() {
  const router = useRouter();

  const onGetStarted = () => {
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Background image (faded) */}
        <Image
          source={require('@/assets/images/worker-bg.jpg')} // TEMP: replace later
          style={styles.bgImage}
          resizeMode="cover"
          blurRadius={6}
        />
        <View style={styles.bgOverlay} />

        <View style={styles.content}>
          {/* TOP CENTER CONTENT */}
          <View style={styles.centerContent}>
            <LinearGradient
              colors={['#2F6BFF', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCard}
            >
              {/* Use your own icon image (recommended) */}
              <Image
                source={require('@/assets/images/worker-welcome.svg')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </LinearGradient>

            <Text style={styles.title}>Welcome</Text>

            <Text style={styles.subtitle}>
              A smarter platform where employers and{'\n'}
              skilled workers connect, collaborate, and{'\n'}
              grow together.
            </Text>
          </View>

          {/* BOTTOM SECTION */}
          <View style={styles.bottomSection}>
            <Pressable style={styles.primaryBtn} onPress={onGetStarted}>
              <Text style={styles.primaryText}>Let’s get started</Text>
            </Pressable>

            <View style={styles.dots}>
             <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive]} />
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
    opacity: 0.18,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    opacity: 0.75,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  centerContent: {
    alignItems: 'center',
    marginTop: 80,
  },

  bottomSection: {
    paddingBottom: 30,
  },

  iconCard: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 14,
    padding: 10,
  },

  iconImage: {
    width: 32,
    height: 32,
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
    maxWidth: 300,
  },

  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: WHITE, fontWeight: '700', fontSize: 14 },

  dots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    justifyContent: 'center',
  },
  dot: {
    width: 30,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: PRIMARY,
  },
});