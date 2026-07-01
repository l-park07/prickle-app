import { OpenSans_400Regular, OpenSans_700Bold, useFonts } from '@expo-google-fonts/open-sans'; //improts OpenSans font used
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from 'react';

export default function RootLayout() {
  // links fonts to string names
  const [fontsLoaded, fontError] = useFonts({
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-Bold': OpenSans_700Bold,
  });

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
