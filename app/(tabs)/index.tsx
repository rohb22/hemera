import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { TaskRow } from '@/components/TaskRow';
import { formatTodayHeading } from '@/domain/calendar';
import type { Task } from '@/domain/types';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing, type } from '@/theme/tokens';

export default function TodayScreen() {
  const router = useRouter();
  const now = useUiStore((s) => s.now);
  const refreshNow = useUiStore((s) => s.refreshNow);
  const showToast = useUiStore((s) => s.showToast);
  const pool = useTasksStore((s) => s.pool);
  const status = useTasksStore((s) => s.status);
  const loadPool = useTasksStore((s) => s.loadPool);
  const completeTask = useTasksStore((s) => s.completeTask);
  const uncompleteTask = useTasksStore((s) => s.uncompleteTask);

  useEffect(() => {
    refreshNow();
    loadPool();
  }, [loadPool, refreshNow]);

  const onComplete = async (task: Task) => {
    await completeTask(task.id);
    showToast({
      message: 'Task completed',
      actionLabel: 'Undo',
      onAction: () => {
        uncompleteTask(task.id);
      },
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Logo />
        <View style={styles.headerText}>
          <Text style={styles.overline}>Today</Text>
          <Text style={styles.heading}>{formatTodayHeading(now)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={spacing.sm}
          onPress={() => router.push('/settings')}
          style={styles.gear}
        >
          <Ionicons name="settings-outline" size={22} color={colors.inkMuted} />
        </Pressable>
      </View>

      <FlatList
        data={pool}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskRow task={item} onToggle={onComplete} />}
        ListHeaderComponent={
          <Text style={[styles.overline, styles.sectionHeader]}>Unscheduled</Text>
        }
        ListEmptyComponent={
          status === 'ready' ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>Tap the + button to add your first task.</Text>
            </View>
          ) : undefined
        }
        contentContainerStyle={styles.listContent}
      />

      <Fab onPress={() => router.push('/sheet/quick-add')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerText: { flex: 1 },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  overline: { ...type.overline, color: colors.inkMuted },
  heading: { ...type.display, color: colors.ink },
  sectionHeader: { paddingBottom: spacing.sm },
  listContent: { paddingBottom: 120 },
  empty: { paddingTop: spacing.xxxl, gap: spacing.xs },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyBody: { ...type.body, color: colors.inkMuted },
});
