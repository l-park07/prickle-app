import { useFonts } from '@expo-google-fonts/open-sans';
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from 'react';
import { fontAssets } from './theme';

export default function RootLayout() {
  // links fonts to string names
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => { // when app is loading, runs effect of splashscreen
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }
  return <Stack screenOptions={{headerShown: false}}/>;
}
