import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#F3F4F6';
const CARD_BG = '#FFFFFF';
const BORDER = '#E5E7EB';

const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#1e293b';
const BLUE_600 = '#2563EB';
const BLUE_500 = '#3B82F6';
const WHITE = '#FFFFFF';

type CheckboxProps = {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

function Checkbox({ value, onChange, disabled }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.checkbox,
        value && styles.checkboxChecked,
        disabled && { opacity: 0.6 },
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      {value ? <Ionicons name="checkmark" size={14} color={WHITE} /> : null}
    </Pressable>
  );
}

export default function AcknowledgementScreen() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(true); // checked by default like Figma

  const isSubmitDisabled = useMemo(() => !isAgreed, [isAgreed]);

  const handleBack = () => router.back();

  const handleSkip = () => {
    // TODO: route to next step or home (match your onboarding flow)
    // router.push('/(tabs)');
  };

  const handleSubmit = () => {
    if (!isAgreed) return;

    // TODO: save agreement (context/api) then go next step
    // router.push('/(tabs)');
  };

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

          <Text style={styles.headerTitle}>Acknowledgement</Text>

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

        {/* Content Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Acknowledgement{'\n'}Terms &amp; Liability
          </Text>


          <ScrollView
            style={styles.termsScroll}
            contentContainerStyle={styles.termsContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.sectionTitle}>
              Acknowledgement, Terms &amp; Liability
            </Text>

            <Text style={styles.paragraph}>
            This Acknowledgement, Terms & Liability Agreement (“Agreement”) governs your access to and use of this mobile application (the “App”). 
            By downloading, accessing, registering with, or using the App, you acknowledge that you have read, understood, and agreed to be legally bound by this Agreement. 
            If you do not agree with any part of these terms, you must immediately discontinue use of the App.
            </Text>

            <Text style={styles.listTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
                Your use of the App constitutes your full acceptance of this Agreement, including any updates or modifications made from time to time. 
                We reserve the right to amend these terms at our sole discretion. 
                Continued use of the App after changes have been made signifies your acceptance of the revised terms.
            </Text>

            <Text style={styles.listTitle}>2. User Responsibilities</Text>
            <Text style={styles.paragraph}>
            You agree that you are solely responsible for:

                •Maintaining the confidentiality of your login credentials and account information
                •All activities conducted under your account
                •Providing accurate, lawful, and up-to-date information
                •Complying with all applicable laws, regulations, and third-party rights

            You accept full responsibility for any actions taken through your account, whether authorized by you or not.
            </Text>

            <Text style={styles.listTitle}>3. No Warranty Disclaimer</Text>
            <Text style={styles.paragraph}>
            The App is provided on an “AS IS” and “AS AVAILABLE” basis, without warranties of any kind, whether express or implied.
            We expressly disclaim any warranties regarding:

                •Continuous, uninterrupted, or error-free operation
                •Accuracy, reliability, or completeness of content
                •Fitness for a particular purpose
                •Compatibility with specific devices, software, or operating systems

            Your use of the App is at your own risk.
            </Text>

            <Text style={styles.listTitle}>4. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
            To the fullest extent permitted by law, the App owners, developers, affiliates, employees, and partners shall not be liable 
            for any direct, indirect, incidental, consequential, special, exemplary, or punitive damages arising out of or related to:

                •Your access to or use of the App
                •Inability to access or use the App
                •Technical errors, system failures, or downtime
                •Data loss, unauthorized access, or security breaches
                •Reliance on information provided through the App

            This limitation applies regardless of the legal theory under which damages are sought.
            </Text>

            <Text style={styles.listTitle}>5. Third-Party Services</Text>
            <Text style={styles.paragraph}>
            The App may integrate with or provide access to third-party services, platforms, or content. 
            We do not control and are not responsible for:

                •The availability or accuracy of third-party services
                •Privacy practices of external platforms
                •Transactions, communications, or agreements made with third parties

            Your interactions with third-party services are at your own risk and subject to their respective terms and conditions.
            </Text>

            <Text style={styles.listTitle}>6. Data Collection & Privacy</Text>
            <Text style={styles.paragraph}>
            By using the App, you acknowledge and consent that:

                •Your personal data may be collected, stored, and processed for operational, functional, security, and service improvement purposes
                •Analytics and monitoring tools may be utilized to enhance user experience and performance

            All data handling practices are governed by our separate Privacy Policy, which forms part of this Agreement.
            </Text>

            <Text style={styles.listTitle}>7. Indentification</Text>
            <Text style={styles.paragraph}>
            You agree to defend, indemnify, and hold harmless the App owners, affiliates, partners, and representatives from and against any claims, damages, losses, liabilities, costs, or expenses (including reasonable legal fees) arising from:

                • Your misuse of the App
                • Violation of this Agreement
                • Breach of applicable laws or third-party rights
            </Text>

            <Text style={styles.listTitle}>8. Suspension & Termination</Text>
            <Text style={styles.paragraph}>
            We reserve the right, at our sole discretion, to suspend or terminate your access to the App at any time without prior notice for reasons including but not limited to:

                •Violation of this Agreement
                •Fraudulent or unlawful conduct
                •Security concerns
                •Operational or technical necessity

            Termination does not waive any rights or remedies available under applicable law.
            </Text>

            <Text style={styles.listTitle}>9. Governing Law</Text>
            <Text style={styles.paragraph}>
            This Agreement shall be governed by and interpreted in accordance with the applicable laws 
            of the jurisdiction in which the App operates, without regard to conflict of law principles.
            </Text>

            <View style={{ height: 12 }} />
          </ScrollView>
        </View>

        {/* Agreement */}
        <View style={styles.agreementRow}>
          <Checkbox value={isAgreed} onChange={setIsAgreed} />
          <Text style={styles.agreementText}>
            I hereby confirm that I have read and agree with the{' '}
            <Text style={styles.linkText}>Terms &amp; Conditions</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Footer Button */}
        <View style={styles.footer}>
          <Pressable
            disabled={isSubmitDisabled}
            style={({ pressed }) => [
              styles.footerButton,
              styles.footerButtonPrimary,
              isSubmitDisabled && { opacity: 0.5 },
              pressed && !isSubmitDisabled && { opacity: 0.9 },
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.footerButtonText}>Submit</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerRight: {
    width: 90,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    alignItems: 'flex-start',
    justifyContent: 'center',
    color: TEXT_PRIMARY,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
    color: BLUE_600,
  },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    flex: 1,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e3559',
    lineHeight: 24,
  },

  termsScroll: {
    marginTop: 12,
    flex: 1,
  },
  termsContent: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 24,
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },

  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BLUE_500,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: BLUE_600,
    borderColor: BLUE_600,
  },
  agreementText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_PRIMARY,
  },
  linkText: {
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  footer: {
    marginTop: 16,
  },
  footerButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimary: {
    backgroundColor: BLUE_600,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
});