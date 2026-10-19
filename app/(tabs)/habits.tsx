import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { HabitRow } from '@/components/HabitRow';
import { Screen } from '@/components/Screen';
import { todayKey } from '@/domain/calendar';
import { weekDates, weekStartKey } from '@/domain/habits';
import type { Habit, HabitOccurrence, OccurrenceState } from '@/domain/types';
import { useHabitsStore } from '@/stores/habitsStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing, type } from '@/theme/tokens';

const EMPTY_OCCURRENCES: HabitOccurrence[] = [];

export default function HabitsScreen() {
  const router = useRouter();
  const now = useUiStore((s) => s.now);
  const refreshNow = useUiStore((s) => s.refreshNow);
  const showToast = useUiStore((s) => s.showToast);
  const habits = useHabitsStore((s) => s.habits);
  const occurrences = useHabitsStore((s) => s.occurrences);
  const load = useHabitsStore((s) => s.load);
  const setOccurrence = useHabitsStore((s) => s.setOccurrence);

  useEffect(() => {
    refreshNow();
    load();
  }, [load, refreshNow]);

  const today = todayKey(now);
  const week = useMemo(() => weekDates(weekStartKey(today)), [today]);

  const occurrencesByHabit = useMemo(() => {
    const map = new Map<string, HabitOccurrence[]>();
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.habitId);
      if (list) list.push(occurrence);
      else map.set(occurrence.habitId, [occurrence]);
    }
    return map;
  }, [occurrences]);

  const onToggleToday = async (habit: Habit, dateKey: string) => {
    const rows = occurrencesByHabit.get(habit.id) ?? [];
    const current = rows.find((o) => o.date === dateKey) ?? null;
    const previousState: OccurrenceState = current?.state ?? 'pending';
    const nextState: OccurrenceState = previousState === 'done' ? 'pending' : 'done';

    try {
      await setOccurrence(habit.id, dateKey, nextState);
    } catch {
      return;
    }

    if (nextState === 'done') {
      showToast({
        message: 'Habit completed',
        actionLabel: 'Undo',
        onAction: () => {
          void setOccurrence(habit.id, dateKey, previousState);
        },
      });
    }
  };

  const onOpenHabit = (habit: Habit) => {
    router.push({ pathname: '/sheet/habit-detail', params: { id: habit.id } });
  };

  return (
    <Screen>
      <FlatList<Habit>
        data={habits}
        keyExtractor={(habit) => habit.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Habits</Text>
          </View>
        }
        renderItem={({ item }) => (
          <HabitRow
            habit={item}
            occurrences={occurrencesByHabit.get(item.id) ?? EMPTY_OCCURRENCES}
            weekDates={week}
            todayKey={today}
            onPress={onOpenHabit}
            onToggleToday={onToggleToday}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptyHint}>Tap + to create one</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Fab
        accessibilityLabel="Create habit"
        onPress={() => router.push({ pathname: '/sheet/quick-add', params: { mode: 'habit' } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  heading: { ...type.display, color: colors.ink },
  empty: { paddingTop: spacing.xxxl, gap: spacing.sm, alignItems: 'flex-start' },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyHint: { ...type.body, color: colors.inkMuted },
  listContent: { paddingBottom: 120 },
});
