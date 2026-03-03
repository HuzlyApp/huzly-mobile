import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#FFFFFF';
const CARD_BG = '#FFFFFF';
const BORDER = '#E5E7EB';

const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';

const BLUE_600 = '#2563EB';
const BLUE_700 = '#1D4ED8';
const BLUE_50 = '#EFF6FF';

const GRAY_BTN_BG = '#F3F4F6';
const GRAY_BTN_TEXT = '#6B7280';
const WHITE = '#FFFFFF';

type PaymentOption = 'stripe' | 'manual';
type PaymentStatus = 'selection' | 'stripe_details';

export default function PaymentMethodScreen() {
  const router = useRouter();

  // UI state only (no Stripe/Supabase integration yet)
  const [selected, setSelected] = useState<PaymentOption>('stripe');
  const [view, setView] = useState<PaymentStatus>('selection');

  const canContinue = useMemo(() => !!selected, [selected]);

  const handleBack = () => {
    if (view === 'stripe_details') {
      setView('selection');
      return;
    }
    router.back();
  };

  const handleSkip = () => {
    // TODO: decide final onboarding skip behavior
    // router.push({ pathname: '/(tabs)' });
    router.back();
  };

  const handleContinue = () => {
    if (selected === 'stripe') {
      setView('stripe_details');
      return;
    }

    // Manual payout path (UI-only for now)
    // router.push({ pathname: '/manual-payout' });
  };

  const handleSave = () => {
    // UI only; later will persist to supabase + handle Stripe connect
    router.back();
  };

  const handleContinueOnStripe = () => {
    // TODO: integrate Stripe Connect onboarding via webview/deeplink
  };

  const isSelection = view === 'selection';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={styles.headerLeft}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </Pressable>

          <Text style={styles.headerTitle}>Payment Method</Text>

          <Pressable
            onPress={handleSkip}
            hitSlop={10}
            style={styles.headerRight}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>

        {/* Body (flex: 1 pushes footer down) */}
        <View style={styles.body}>
          {isSelection ? (
            <>
              <Text style={styles.subtitle}>
                Set up your payout method to receive salary payments.
              </Text>

              <View style={styles.optionList}>
                <PaymentOptionCard
                  title="Bank payout (Stripe)"
                  subtitle="Fastest and recommended"
                  iconName="business-outline"
                  isStripe
                  selected={selected === 'stripe'}
                  onPress={() => setSelected('stripe')}
                />

                <PaymentOptionCard
                  title="Manual payout"
                  subtitle="For special cases (slower)"
                  subtitlePrefix="(Admin-assisted)"
                  iconName="business-outline"
                  selected={selected === 'manual'}
                  onPress={() => setSelected('manual')}
                />
              </View>
            </>
          ) : (
            <>
              {/* Stripe Details Card */}
              {/* <View style={styles.stripeHeaderRow}>
              <View style={styles.detailsIconBox}>
                      <Image
                        source={require('@/assets/logos/stripe.png')}
                        style={styles.stripeLogoSmall}
                      />
                    </View>
                <Text style={styles.stripeHeaderTitle}>Payment Method</Text>
              </View> */}

              <View style={styles.detailsCard}>
                <View style={styles.detailsTopRow}>
                  <View style={styles.detailsTitleRow}>
                    <View style={styles.detailsIconBox}>
                      <Image
                        source={require('@/assets/logos/stripe.png')}
                        style={styles.stripeLogoSmall}
                      />
                    </View>
                    <Text style={styles.detailsTitle}>Payout account (Stripe)</Text>
                  </View>

                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Action required</Text>
                  </View>
                </View>

                <Text style={styles.detailsBodyText}>
                  Stripe needs more info to enable payouts.
                </Text>

                <Pressable
                  onPress={handleContinueOnStripe}
                  style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.ctaButtonText}>Continue on Stripe</Text>
                </Pressable>

                <View style={styles.infoBox}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="information-circle" size={18} color={BLUE_700} />
                  </View>
                  <Text style={styles.infoText}>
                    We use Stripe to securely handle identity verification and bank payouts.
                    Huzly never stores your bank details.
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Footer (always at bottom) */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.footerButton,
              styles.footerButtonSecondary, // gray
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.footerSecondaryText}>Back</Text>
          </Pressable>

          {isSelection ? (
            <Pressable
              disabled={!canContinue}
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.footerButton,
                styles.footerButtonPrimary, // blue
                !canContinue && { opacity: 0.5 },
                pressed && canContinue && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.footerPrimaryText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.footerButton,
                styles.footerButtonPrimary, // blue
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.footerPrimaryText}>Save</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

type PaymentOptionCardProps = {
  title: string;
  subtitle: string;
  subtitlePrefix?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  isStripe?: boolean;
};

function PaymentOptionCard({
  title,
  subtitle,
  subtitlePrefix,
  iconName,
  selected,
  onPress,
  isStripe,
}: PaymentOptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && { opacity: 0.95 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.optionRow}>
        <View style={styles.optionLeft}>
          <View style={[styles.optionIconBox, selected && styles.optionIconBoxSelected]}>
            {isStripe ? (
              <Image
                source={require('@/assets/logos/stripe.png')}
                style={styles.stripeLogo}
              />
            ) : (
              <Ionicons name={iconName} size={18} color={selected ? BLUE_700 : TEXT_SECONDARY} />
            )}
          </View>

          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionSubtitle}>
              {subtitlePrefix ? `${subtitlePrefix} ` : ''}
              {subtitle}
            </Text>
          </View>
        </View>

        <View pointerEvents="none">
          <Ionicons name="chevron-forward" size={18} color={BLUE_600} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BACKGROUND,
  },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerLeft: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRight: {
    width: 90,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
    color: BLUE_600,
  },

  body: {
    flex: 1,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_SECONDARY,
  },

  optionList: {
    marginTop: 18,
    gap: 14,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    padding: 14,
  },
  optionCardSelected: {
    borderColor: '#C7D7FF',
    backgroundColor: '#F9FAFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  optionIconBoxSelected: {
    borderColor: '#C7D7FF',
    backgroundColor: BLUE_50,
  },
  stripeLogo: {
    width: 24,
    height: 16,
    resizeMode: 'contain',
  },
  stripeLogoSmall: {
    width: 22,
    height: 14,
    resizeMode: 'contain',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  optionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  stripeHeaderRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  stripeHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  stripeHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  detailsCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#C7D7FF',
    backgroundColor: WHITE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailsTopRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  detailsIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D7FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE_50,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FDE7C7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },

  detailsBodyText: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },

  ctaButton: {
    marginHorizontal: 14,
    marginBottom: 12,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE_700,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },

  infoBox: {
    borderTopWidth: 1,
    borderTopColor: '#E5F0FF',
    backgroundColor: '#F6FAFF',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_SECONDARY,
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  footerButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerButtonSecondary: {
    backgroundColor: GRAY_BTN_BG,
  },
  footerButtonPrimary: {
    backgroundColor: BLUE_700,
  },

  footerSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: GRAY_BTN_TEXT,
  },
  footerPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHITE,
  },
});