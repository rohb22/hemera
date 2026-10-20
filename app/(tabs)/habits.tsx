import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/PrimaryButton';
import { Fab } from '@/components/Fab';
import { HabitRow } from '@/components/HabitRow';
import { Screen } from '@/components/Screen';
import { todayKey } from '@/domain/calendar';
import { weekDates, weekStartFor } from '@/domain/habits';
import type { Habit, HabitOccurrence, OccurrenceState } from '@/domain/types';
import { useHabitsStore } from '@/stores/habitsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing, type } from '@/theme/tokens';

const EMPTY_OCCURRENCES: HabitOccurrence[] = [];

export default function HabitsScreen() {
  const router = useRouter();
  const now = useUiStore((s) => s.now);
  const refreshNow = useUiStore((s) => s.refreshNow);
  const showToast = useUiStore((s) => s.showToast);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const habits = useHabitsStore((s) => s.habits);
  const occurrences = useHabitsStore((s) => s.occurrences);
  const status = useHabitsStore((s) => s.status);
  const load = useHabitsStore((s) => s.load);
  const setOccurrence = useHabitsStore((s) => s.setOccurrence);

  useEffect(() => {
    refreshNow();
    load();
  }, [load, refreshNow]);

  const today = todayKey(now);
  const week = useMemo(
    () => weekDates(weekStartFor(today, weekStartsOn)),
    [today, weekStartsOn],
  );

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
      {status === 'error' ? (
        <View style={styles.body}>
          <Text style={styles.heading}>Habits</Text>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn’t load your habits</Text>
            <Text style={styles.emptyHint}>They’re still safe on this device.</Text>
            <Button label="Try again" variant="secondary" onPress={() => void load()} />
          </View>
        </View>
      ) : status === 'loading' && habits.length === 0 ? (
        <View style={styles.body}>
          <Text style={styles.heading}>Habits</Text>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your habits"
            style={styles.skeletonWrap}
          >
            <View style={[styles.skeleton, { height: 64 }]} />
            <View style={[styles.skeleton, { height: 64 }]} />
            <View style={[styles.skeleton, { height: 64, width: '85%' }]} />
          </View>
        </View>
      ) : (
        <FlatList<Habit>
          data={habits}
          keyExtractor={(habit) => habit.id}
          showsVerticalScrollIndicator={false}
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
      )}

      <Fab
        accessibilityLabel="Create habit"
        onPress={() => router.push({ pathname: '/sheet/quick-add', params: { mode: 'habit' } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.sm },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  heading: { ...type.display, color: colors.ink },
  empty: { paddingTop: spacing.xxxl, gap: spacing.sm, alignItems: 'flex-start' },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyHint: { ...type.body, color: colors.inkMuted },
  skeletonWrap: { paddingTop: spacing.lg, gap: spacing.md },
  skeleton: { backgroundColor: colors.surfaceMuted, borderRadius: spacing.sm },
  listContent: { paddingBottom: 120 },
});
