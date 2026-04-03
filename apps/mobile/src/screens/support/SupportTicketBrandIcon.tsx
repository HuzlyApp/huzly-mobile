import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const ICON = require('../../../public/support_icon.png');

type Props = {
  size?: number;
};

export default function SupportTicketBrandIcon({ size = 44 }: Props) {
  const inner = Math.round(size * 0.48);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={ICON}
        style={{ width: inner, height: inner, tintColor: '#FFFFFF' }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
