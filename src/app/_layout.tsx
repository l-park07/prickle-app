import { useFonts } from '@expo-google-fonts/open-sans';
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthProvider';
import { dbReady } from '../lib/db';
import { fontAssets } from './theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  // links fonts to string names
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const { user, initializing } = useAuth();
  const [dbInitialized, setDbInitialized] = useState(false);
  const ready = (fontsLoaded || !!fontError) && !initializing && dbInitialized;

  useEffect(() => {
    dbReady.then(() => setDbInitialized(true)).catch(console.error);
  }, []);

  useEffect(() => { // when app is loading, runs effect of splashscreen
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
