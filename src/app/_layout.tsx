import { useFonts } from '@expo-google-fonts/open-sans';
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthProvider';
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
  const ready = (fontsLoaded || !!fontError) && !initializing;

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
