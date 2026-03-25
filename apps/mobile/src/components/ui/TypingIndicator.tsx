import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export interface TypingIndicatorProps {
  bubbleColor?: string;
  dotColor?: string;
  dotSize?: number;
  dotSpacing?: number;
  speedMs?: number; // one up+down cycle
  staggerMs?: number;
  bubbleScaleAmplitude?: number; // subtle breathing effect
  style?: StyleProp<ViewStyle>;
}

export default function TypingIndicator({
  bubbleColor = '#ECF1F9',
  dotColor = '#94A3B8',
  dotSize = 6,
  dotSpacing = 6,
  speedMs = 700,
  staggerMs = 140,
  bubbleScaleAmplitude = 0.03,
  style,
}: TypingIndicatorProps) {
  const translate1 = useRef(new Animated.Value(0)).current;
  const translate2 = useRef(new Animated.Value(0)).current;
  const translate3 = useRef(new Animated.Value(0)).current;

  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;

  const bubbleScale = useRef(new Animated.Value(1)).current;
  const runningRef = useRef(true);

  const easing = useMemo(() => Easing.inOut(Easing.quad), []);

  useEffect(() => {
    runningRef.current = true;

    const bounceDistance = 7;
    const upMs = Math.max(120, Math.floor(speedMs / 2));
    const downMs = Math.max(120, Math.floor(speedMs / 2));

    const animateDot = (
      translateY: Animated.Value,
      scale: Animated.Value,
      delay: number,
    ) => {
      return Animated.sequence([
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -bounceDistance,
            duration: upMs,
            delay,
            easing,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.18,
            duration: upMs,
            delay,
            easing,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: downMs,
            easing,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: downMs,
            easing,
            useNativeDriver: true,
          }),
        ]),
      ]);
    };

    const cycle = () => {
      const parallel = Animated.parallel([
        animateDot(translate1, scale1, 0),
        animateDot(translate2, scale2, staggerMs),
        animateDot(translate3, scale3, staggerMs * 2),
      ]);

      parallel.start(({ finished }) => {
        if (!finished || !runningRef.current) return;
        cycle();
      });
    };

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleScale, {
          toValue: 1 + bubbleScaleAmplitude,
          duration: 900,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleScale, {
          toValue: 1,
          duration: 900,
          easing,
          useNativeDriver: true,
        }),
      ]),
    );

    breathing.start();
    cycle();

    return () => {
      runningRef.current = false;
      breathing.stop();
      // Stop any active dot animations.
      translate1.stopAnimation();
      translate2.stopAnimation();
      translate3.stopAnimation();
      scale1.stopAnimation();
      scale2.stopAnimation();
      scale3.stopAnimation();
    };
  }, [
    bubbleScale,
    bubbleScaleAmplitude,
    dotColor,
    easing,
    scale1,
    scale2,
    scale3,
    staggerMs,
    speedMs,
    translate1,
    translate2,
    translate3,
  ]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        style,
        {
          backgroundColor: bubbleColor,
          transform: [{ scale: bubbleScale }],
        },
      ]}
    >
      <View style={styles.dotsRow}>
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: dotColor,
              marginLeft: 0,
              transform: [{ translateY: translate1 }, { scale: scale1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: dotColor,
              marginLeft: dotSpacing,
              transform: [{ translateY: translate2 }, { scale: scale2 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: dotColor,
              marginLeft: dotSpacing,
              transform: [{ translateY: translate3 }, { scale: scale3 }],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dot: {
    borderRadius: 999,
  },
});

