import { Fraunces_500Medium, useFonts } from '@expo-google-fonts/fraunces';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bootstrap } from '@/bootstrap';
import { ToastHost } from '@/components/Toast';
import { colors, fontFamily, type } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_500Medium });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    bootstrap()
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setDbReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const ready = fontsLoaded && dbReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: fontFamily.heading, ...type.section, color: colors.ink },
            headerTintColor: colors.accent,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{ headerShown: true, title: 'Settings', presentation: 'card' }}
          />
          <Stack.Screen
            name="sheet/quick-add"
            options={{ presentation: 'modal', title: 'New task' }}
          />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
