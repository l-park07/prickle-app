import { useFonts } from '@expo-google-fonts/open-sans';
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthProvider';
import { dbReady } from '../lib/db';
import { fontAssets } from './theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
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
        <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: true, title: 'Log' }} />
        <Stack.Screen name="dev-debug" options={{ headerShown: true, title: 'Debug' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
