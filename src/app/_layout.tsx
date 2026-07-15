import { useFonts } from '@expo-google-fonts/open-sans';
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthProvider';
import { OnboardingProvider, useOnboarding } from '../context/OnboardingProvider';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { useAppForeground } from '../hooks/useAppForeground';
import { db, dbReady } from '../lib/db';
import { ensureNotificationChannel, rescheduleNotifications } from '../lib/notificationScheduler';
import { fontAssets } from './theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <OnboardingProvider>
          <RootNavigator />
        </OnboardingProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  // links fonts to string names
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const { user, initializing } = useAuth();
  const { onboardingComplete } = useOnboarding();
  const [dbInitialized, setDbInitialized] = useState(false);
  // A signed-out user has no uid for OnboardingProvider to key off of, so
  // onboardingComplete stays null for them forever — only gate on it when
  // there's actually someone signed in to check it for.
  const ready = (fontsLoaded || !!fontError) && !initializing && dbInitialized && (!user || onboardingComplete !== null);
  const activeUserId = useActiveUserId();

  useEffect(() => {
    dbReady.then(() => setDbInitialized(true)).catch(console.error);
  }, []);

  useEffect(() => { // when app is loading, runs effect of splashscreen
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Android 13+ needs a channel to exist before the permission prompt appears.
  useEffect(() => {
    ensureNotificationChannel();
  }, []);

  // Refresh scheduled notifications on launch, and again whenever the app
  // returns to the foreground — both the daily and weekly one-shots need a
  // recompute whenever a day may have passed.
  useEffect(() => {
    if (ready && activeUserId) rescheduleNotifications(db, activeUserId);
  }, [ready, activeUserId]);
  useAppForeground(() => {
    if (activeUserId) rescheduleNotifications(db, activeUserId);
  });

  if (!ready) {
    return null;
  }
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Protected guard={!!user}>
        {/* (tabs)/onboarding must be declared first: React Navigation defaults
            the stack's initial route to the first declared (guard-passing)
            screen, and that needs to be the app's real home, not a modal. */}
        <Stack.Protected guard={onboardingComplete === true}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: true, title: 'Log' }} />
          <Stack.Screen name="dev-debug" options={{ headerShown: true, title: 'Debug' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboardingComplete === false}>
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>

        {/* Always reachable once signed in, regardless of onboarding state —
            onboarding's "take your first weekly check" invitation pushes
            these directly, and assessment.tsx's dismissTo('/weekly') needs
            'weekly' to already be a registered route name, not just gated
            behind a guard whose flip hasn't re-rendered yet. */}
        <Stack.Screen
          name="assessment"
          options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="weekly" options={{ headerShown: true, title: 'POEM/RECAP Details' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
