import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { todayKey } from '@/domain/calendar';
import { useUiStore } from '@/stores/uiStore';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.hairline },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => {
            // Tapping the Today tab always returns the view to the current day.
            if (useUiStore.getState().viewDate !== todayKey(new Date())) {
              useUiStore.getState().goToday();
            }
          },
        }}
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="today-outline"
              size={size}
              color={focused ? colors.accent : colors.inkMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="repeat-outline"
              size={size}
              color={focused ? colors.accent : colors.inkMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
