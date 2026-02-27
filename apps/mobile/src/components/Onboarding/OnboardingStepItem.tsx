import React from 'react';
import { Pressable, PressableStateCallbackType, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OnboardingStepItemProps = {
  index: number;
  title: string;
  subtitle: string;
  onPress: () => void;
};

const BORDER_BLUE = '#C7D7FF';
const PRIMARY_BLUE = '#2F6BFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const CARD_BACKGROUND = '#FFFFFF';

export function OnboardingStepItem({ index, title, subtitle, onPress }: OnboardingStepItemProps) {
  const renderStyle = ({ pressed }: PressableStateCallbackType): ViewStyle[] => [
    styles.container,
    pressed && styles.containerPressed,
  ];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(47, 107, 255, 0.08)', borderless: false }}
      style={renderStyle}>
      <View style={styles.row}>
        <View style={styles.circle}>
          <Text style={styles.circleText}>{index}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={PRIMARY_BLUE} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_BLUE,
    backgroundColor: CARD_BACKGROUND,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  containerPressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
});

