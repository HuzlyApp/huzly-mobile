/**
 * confirm-email.tsx
 *
 * Shown after email sign-up when Supabase email confirmation is enabled.
 * Tells the user to check their inbox and provides a "Resend" action.
 *
 * When the user taps the magic link in their email, Supabase redirects
 * them back into the app via the deep-link scheme. The root layout's
 * onAuthStateChange listener picks up the new session and navigates
 * automatically — so this screen only needs to be informational.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/config/supabase';

const BG = '#FFFFFF';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const PRIMARY = '#3B6FD8';
const BORDER_SOFT = '#E5E7EB';

export default function ConfirmEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string; next?: string }>();
    const email = params.email ?? '';

    const [resending, setResending] = useState(false);

    const onResend = async () => {
        if (!email) {
            Alert.alert('Error', 'No email address found. Please go back and try again.');
            return;
        }

        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });

            if (error) {
                Alert.alert('Failed to resend', error.message);
            } else {
                Alert.alert('Email sent', `A new confirmation link has been sent to ${email}.`);
            }
        } finally {
            setResending(false);
        }
    };

    const onBack = () => router.replace('/auth');

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.card}>
                    {/* Icon */}
                    <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>✉️</Text>
                    </View>

                    <Text style={styles.title}>Check your email</Text>

                    <Text style={styles.sub}>
                        We sent a confirmation link to{'\n'}
                        <Text style={styles.emailText}>{email}</Text>
                    </Text>

                    <Text style={styles.hint}>
                        Tap the link in your email to verify your account. Once confirmed, you'll be signed in automatically.
                    </Text>

                    {/* Resend */}
                    <Pressable
                        onPress={onResend}
                        disabled={resending}
                        style={[styles.primaryBtn, resending && { opacity: 0.7 }]}
                    >
                        {resending ? (
                            <View style={styles.row}>
                                <ActivityIndicator color="#fff" />
                                <Text style={[styles.primaryText, { marginLeft: 8 }]}>Resending…</Text>
                            </View>
                        ) : (
                            <Text style={styles.primaryText}>Resend confirmation email</Text>
                        )}
                    </Pressable>

                    {/* Back to auth */}
                    <Pressable onPress={onBack} hitSlop={8} style={{ marginTop: 14 }}>
                        <Text style={styles.backLink}>← Back to Sign In</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER_SOFT,
        padding: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconText: { fontSize: 24 },
    title: { fontSize: 20, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8, textAlign: 'center' },
    sub: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20 },
    emailText: { color: TEXT_PRIMARY, fontWeight: '600' },
    hint: {
        marginTop: 12,
        fontSize: 12,
        color: TEXT_SECONDARY,
        textAlign: 'center',
        lineHeight: 18,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    primaryBtn: {
        marginTop: 20,
        width: '100%',
        height: 44,
        borderRadius: 10,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    backLink: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
});
