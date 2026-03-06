// apps/mobile/src/lib/auth/auth.service.ts

import { supabase } from '@/lib/config/supabase';

type Role = 'Worker' | 'Client';

type SignUpEmailArgs = {
  email: string;
  password: string;
  fullName?: string;
  role?: Role;
};

type SignUpPhoneArgs = {
  phone: string; // E.164 format: +639xxxxxxxxx / +1xxxxxxxxxx
  role?: Role;
};

export async function signUpWithEmail(args: SignUpEmailArgs): Promise<{
  data: { needsEmailConfirm: boolean; userId?: string };
  error: string | null;
}> {
  try {
    const email = args.email.trim().toLowerCase();
    const password = args.password;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: args.fullName ?? '',
          role: args.role ?? 'Worker',
        },
        // emailRedirectTo: 'yourapp://auth/callback',
      },
    });

    if (error) {
      return {
        data: { needsEmailConfirm: false },
        error: error.message,
      };
    }

    const needsEmailConfirm = !data.session;

    return {
      data: {
        needsEmailConfirm,
        userId: data.user?.id,
      },
      error: null,
    };
  } catch (e: any) {
    return {
      data: { needsEmailConfirm: false },
      error: e?.message ?? 'Signup failed',
    };
  }
}

/**
 * Send phone OTP via Supabase Auth.
 */
// export async function sendPhoneOtp(args: SignUpPhoneArgs): Promise<{ error: string | null }> {
//   try {
//     console.log("📱 OTP will be sent to:", args.phone);
//     const { data, error } = await supabase.auth.signInWithOtp({
//       phone: args.phone,
//       options: {
//         data: {
//           role: args.role ?? 'worker',
//         },
//       },
//     });
//     console.log('[SUPABASE OTP] data:', data);
//     console.log('[SUPABASE OTP] error:', error);

//     console.log("📱 OTP will be sent to:", args.phone);
//     if (error) return { error: error.message };
//     console.log("✅ OTP request successfully sent");
//     return { error: null };
//   } catch (e: any) {
//     console.log("❌ OTP exception:", e);
//     return { error: e?.message ?? 'Failed to send phone OTP' };
//   }
// }
export async function sendPhoneOtp(args: SignUpPhoneArgs) {
  const { data, error } = await supabase.functions.invoke(
    "send-phone-otp",
    {
      body: { phone: args.phone },
    }
  );

  if (error) return { error: error.message };

  return { error: null };
}

/**
 * Verify phone OTP.
 */
// export async function verifyPhoneOtp(phone: string, otp: string) {
//   const { data, error } = await supabase.functions.invoke(
//     "check-phone-otp",
//     {
//       body: { phone, code: otp },
//     }
//   );

//   if (error) return { error: error.message };

//   if (!data?.verified) {
//     return { error: "Invalid verification code" };
//   }

//   return { error: null };
// }
export async function verifyPhoneOtp(phone: string, otp: string) {

  const { data, error } =
    await supabase.functions.invoke(
      "check-phone-otp",
      {
        body: { phone, code: otp },
      }
    );

  if (error) return { error: error.message };

  if (!data?.verified) {
    return { error: "Invalid OTP" };
  }

  if (data?.session?.properties) {

    await supabase.auth.setSession({
      access_token: data.session.properties.access_token,
      refresh_token: data.session.properties.refresh_token,
    });

  }

  return { error: null };
}

/**
 * Send email OTP for existing signed up user.
 */
export async function sendEmailOtp(email: string): Promise<{ error: string | null }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? 'Failed to send email OTP' };
  }
}

/**
 * Verify email OTP.
 */
export async function verifyEmailOtp(
  email: string,
  otp: string
): Promise<{ error: string | null }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp,
      type: 'email',
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? 'Email verification failed' };
  }
}

/**
 * Shared resend helper for OTP screen.
 */
export async function resendOtp(args: {
  phone?: string;
  email?: string;
  role?: Role;
}): Promise<{ error: string | null }> {
  if (args.phone) {
    return sendPhoneOtp({
      phone: args.phone,
      role: args.role ?? 'Worker',
    });
  }

  if (args.email) {
    return sendEmailOtp(args.email);
  }

  return { error: 'Missing phone or email.' };
}