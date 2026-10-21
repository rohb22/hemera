import { Fraunces_500Medium, useFonts } from '@expo-google-fonts/fraunces';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bootstrap } from '@/bootstrap';
import { ToastHost } from '@/components/Toast';
import { getLastResponseTaskId, onNotificationResponse } from '@/services/reminders';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, fontFamily, spacing, type } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

function BootError({ message }: { message: string }) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Hemera couldn’t start</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Text style={styles.errorHint}>Reopen the app to try again.</Text>
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({ Fraunces_500Medium });
  const [dbReady, setDbReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    bootstrap()
      .catch((e: unknown) => {
        if (mounted) {
          setBootError(e instanceof Error ? e.message : 'Bootstrap failed');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (mounted) setDbReady(true);
      });
    timeout = setTimeout(() => {
      if (mounted) {
        setBootError('Starting the database took too long.');
        setDbReady(true);
      }
    }, 15000);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const ready = (fontsLoaded || !!fontError) && dbReady;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const refreshNow = () => useUiStore.getState().refreshNow();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshNow();
        void useTasksStore.getState().load();
      }
    });
    const interval = setInterval(refreshNow, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [ready]);

  // D19: opening a task reminder lands on that task's sheet.
  useEffect(() => {
    if (!ready) return;
    const openTask = (taskId: string | null) => {
      if (taskId) router.push({ pathname: '/sheet/task', params: { id: taskId } });
    };
    const unsubscribe = onNotificationResponse(openTask);
    void getLastResponseTaskId().then(openTask);
    return unsubscribe;
  }, [ready, router]);

  if (!ready) {
    return null;
  }

  if (bootError) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BootError message={bootError} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

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
            name="archived-habits"
            options={{ headerShown: true, title: 'Archived habits', presentation: 'card' }}
          />
          <Stack.Screen
            name="sheet/quick-add"
            options={{ presentation: 'modal', title: 'New task' }}
          />
          <Stack.Screen
            name="sheet/task"
            options={{ presentation: 'modal', title: 'Edit task' }}
          />
          <Stack.Screen
            name="sheet/task-actions"
            options={{ presentation: 'modal', title: 'Task actions' }}
          />
          <Stack.Screen
            name="sheet/habit"
            options={{ presentation: 'modal', title: 'Habit' }}
          />
          <Stack.Screen
            name="sheet/habit-detail"
            options={{ presentation: 'modal', title: 'Habit' }}
          />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.xxl,
    paddingTop: spacing.huge,
    gap: spacing.md,
  },
  errorTitle: { ...type.title, color: colors.ink },
  errorBody: { ...type.body, color: colors.inkMuted },
  errorHint: { ...type.caption, color: colors.inkFaint },
});
