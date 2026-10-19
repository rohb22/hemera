import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HabitDayCells } from '@/components/HabitDayCells';
import { toDateKey } from '@/domain/calendar';
import { progressCaption, weekStartKey, weeklyProgress } from '@/domain/habits';
import type { Habit, HabitOccurrence } from '@/domain/types';
import { colors, spacing, type } from '@/theme/tokens';

interface HabitRowProps {
  habit: Habit;
  occurrences: HabitOccurrence[];
  weekDates: string[];
  todayKey: string;
  onPress: (habit: Habit) => void;
  onToggleToday: (habit: Habit, dateKey: string) => void;
}

export function HabitRow({
  habit,
  occurrences,
  weekDates,
  todayKey,
  onPress,
  onToggleToday,
}: HabitRowProps) {
  const progress = useMemo(
    () =>
      weeklyProgress(habit.daysMask, occurrences, weekStartKey(todayKey), toDateKey(new Date(habit.createdAt))),
    [habit, occurrences, todayKey],
  );

  const handleCellPress = (dateKey: string, editable: boolean) => {
    if (editable) onToggleToday(habit, dateKey);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, ${progressCaption(progress)}`}
        onPress={() => onPress(habit)}
        style={styles.nameButton}
      >
        <Text style={styles.name} numberOfLines={1}>
          {habit.name}
        </Text>
      </Pressable>

      <HabitDayCells
        habit={habit}
        weekDates={weekDates}
        todayKey={todayKey}
        occurrences={occurrences}
        onCellPress={handleCellPress}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, ${progressCaption(progress)}${progress.met ? ', target met' : ''}`}
        onPress={() => onPress(habit)}
        style={styles.captionButton}
      >
        <Text style={styles.caption}>{progressCaption(progress)}</Text>
        {progress.met && <Text style={styles.met}>· target met</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    gap: spacing.sm,
  },
  nameButton: { minHeight: 28, justifyContent: 'center' },
  name: { ...type.body, color: colors.ink, fontWeight: '600' },
  captionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 24,
  },
  caption: { ...type.caption, color: colors.inkMuted },
  met: { ...type.caption, color: colors.accent, fontWeight: '600' },
});
