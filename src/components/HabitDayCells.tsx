import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toDateKey } from '@/domain/calendar';
import {
  DAY_LETTERS,
  DAY_NAMES,
  dayIndexOfWeek,
  habitDayLabel,
  habitDayState,
  plannedOn,
  type HabitDayState,
} from '@/domain/habits';
import type { Habit, HabitOccurrence, OccurrenceState } from '@/domain/types';
import { colors, hitTarget, spacing } from '@/theme/tokens';

interface ShapeSpec {
  size: number;
  kind: 'fill' | 'ring';
  color: string;
}

/**
 * Shape vocabulary (design-system §2.4):
 *
 * - `done`   → filled 12 pt accent circle.
 * - `skipped` / `pending` → hollow 12 pt ring.
 * - `missed` → small filled 8 pt circle, faint (a past *planned* day with no
 *   record).
 * - `neutral` → hollow hairline ring, exactly like an inactive day. This is
 *   a day that predates the habit, so it has **no state at all**; it must
 *   not wear the filled-dot vocabulary that means "done" (FR-H2: days
 *   before creation are excluded from the habit's history).
 * - `unplanned` → hollow hairline ring.
 */
export const SHAPE_BY_STATE: Record<HabitDayState, ShapeSpec> = {
  done: { size: 12, kind: 'fill', color: colors.accent },
  skipped: { size: 12, kind: 'ring', color: colors.inkMuted },
  pending: { size: 12, kind: 'ring', color: colors.inkMuted },
  missed: { size: 8, kind: 'fill', color: colors.inkFaint },
  neutral: { size: 12, kind: 'ring', color: colors.hairline },
  unplanned: { size: 12, kind: 'ring', color: colors.hairline },
};

export function HabitStateShape({ state }: { state: HabitDayState }) {
  const { size, kind, color } = SHAPE_BY_STATE[state];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: kind === 'fill' ? color : 'transparent',
          borderWidth: kind === 'ring' ? 1.5 : 0,
          borderColor: color,
        },
      ]}
    />
  );
}

interface HabitDayCellsProps {
  habit: Habit;
  weekDates: string[];
  todayKey: string;
  occurrences: HabitOccurrence[];
  /** When provided, every cell swallows the tap; today's calls onToggleToday. */
  onCellPress?: (dateKey: string, editable: boolean) => void;
}

export function HabitDayCells({
  habit,
  weekDates,
  todayKey,
  occurrences,
  onCellPress,
}: HabitDayCellsProps) {
  const rowsByDate = useMemo(() => {
    const map = new Map<string, OccurrenceState>();
    for (const occurrence of occurrences) map.set(occurrence.date, occurrence.state);
    return map;
  }, [occurrences]);

  const createdAtKey = toDateKey(new Date(habit.createdAt));

  return (
    <View style={styles.row}>
      {weekDates.map((dateKey) => {
        const weekdayIndex = dayIndexOfWeek(dateKey);
        const planned = plannedOn(habit.daysMask, dateKey);
        const state = habitDayState({
          dateKey,
          rowState: rowsByDate.get(dateKey) ?? null,
          daysMask: habit.daysMask,
          createdAtKey,
          todayKey,
        });
        const isToday = dateKey === todayKey;
        const editable = isToday;
        const label = `${DAY_NAMES[weekdayIndex]}, ${habitDayLabel(state, planned)}`;
        // A day that predates the habit is not part of its schedule, so its
        // letter stays faint even on a planned weekday.
        const emphasised = planned && state !== 'neutral';

        const cellContent = (
          <>
            <Text style={[styles.letter, emphasised ? styles.letterPlanned : styles.letterUnplanned]}>
              {DAY_LETTERS[weekdayIndex]}
            </Text>
            <HabitStateShape state={state} />
          </>
        );

        if (!onCellPress) {
          return (
            <View
              key={dateKey}
              accessible
              accessibilityRole="text"
              accessibilityLabel={label}
              style={[styles.cell, isToday && styles.cellToday]}
            >
              {cellContent}
            </View>
          );
        }

        return (
          <Pressable
            key={dateKey}
            accessibilityRole={editable ? 'button' : 'text'}
            accessibilityLabel={label}
            accessibilityState={editable ? { selected: state === 'done' } : undefined}
            onPress={() => onCellPress(dateKey, editable)}
            style={[styles.cell, isToday && styles.cellToday]}
          >
            {cellContent}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    minWidth: hitTarget,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
  },
  cellToday: { backgroundColor: colors.accentSoft },
  letter: { fontSize: 11, fontWeight: '600' },
  letterPlanned: { color: colors.inkMuted },
  letterUnplanned: { color: colors.inkFaint },
});
