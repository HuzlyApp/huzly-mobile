import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ProgressCardProps = {
  label?: string;
  percentage: number;
};

const PRIMARY_BLUE = '#2F6BFF';
const TRACK_GREY = '#E5E7EB';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#111827';
const BORDER_COLOR = '#E5E7EB';

export function ProgressCard({ label = 'Progress', percentage }: ProgressCardProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percentageText}>{`${clampedPercentage}%`}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampedPercentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: TRACK_GREY,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PRIMARY_BLUE,
  },
});

