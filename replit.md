# Huzly App

## Overview
A React Native / Expo mobile application called "huzly-app". It is a job marketplace / workforce platform with authentication, onboarding, messaging, resume upload, and payment features.

## Architecture

- **Framework**: Expo (React Native) with Expo Router (file-based routing)
- **Language**: TypeScript
- **Backend/Auth**: Supabase (auth, database, edge functions)
- **Navigation**: expo-router with Stack and Tab navigation
- **State**: React Context + React hooks
- **Styling**: React Native StyleSheet

## Project Structure

```
apps/
  mobile/               # Main Expo app
    app/                # File-based routes (expo-router)
      _layout.tsx       # Root layout with auth guard
      (tabs)/           # Main tab screens
      auth/             # Auth screens (signin, signup, OTP)
      messaging/        # Messaging screens
      support/          # Support screens
      onboarding-steps/ # Onboarding flow
    src/
      components/       # Reusable UI components
      constants/        # App constants
      hooks/            # Custom hooks
      lib/
        auth/           # Auth services
        config/         # env.ts, supabase.ts, axios.ts
        jobs/           # Job-related services
        messages/       # Messaging services
        requirements/   # Requirements services
        resume/         # Resume services
        support/        # Support services
      screens/          # Screen components
      stores/           # React Context stores
    assets/             # Images, fonts
db/
  migrations/           # Database migration files
supabase/
  functions/            # Supabase edge functions (send-phone-otp, check-phone-otp)
packages/               # Shared packages (currently empty)
infra/                  # Infrastructure config
scripts/                # Utility scripts
```

## Environment Variables

Required environment variables (must be set as secrets):
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous API key

Optional:
- `EXPO_PUBLIC_API_BASE_URL` — Custom API base URL

## Workflow

- **Start application**: `cd apps/mobile && npx expo start --web --port 5000`
  - Expo dev server runs on port 5000
  - Web version accessible in browser preview
  - Scan QR code from Replit URL bar to test on physical device via Expo Go

## Key Dependencies

- expo ~54.0.33
- expo-router ~6.0.23
- @supabase/supabase-js ^2.97.0
- react-native 0.81.5
- react 19.1.0
- @react-native-async-storage/async-storage

## Notes

- Uses Expo Router file-based routing (similar to Next.js Pages Router)
- Auth is managed by Supabase with phone OTP and email/password flows
- The app has onboarding, messaging, resume upload, and job matching features
- New Architecture enabled (`newArchEnabled: true` in app.json)
- React Compiler enabled
