import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toDateKey } from '@/domain/calendar';
import { colors, fontFamily, hitTarget, radii, spacing, type } from '@/theme/tokens';

interface MiniCalendarProps {
  selected: string | null;
  onSelect: (dateKey: string) => void;
}

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MiniCalendar({ selected, onSelect }: MiniCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedDate = selected ? new Date(`${selected}T00:00:00`) : null;
  const today = new Date();

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={spacing.sm}
          onPress={() => setMonth((m) => addMonths(m, -1))}
          style={styles.monthButton}
        >
          <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
        </Pressable>
        <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={spacing.sm}
          onPress={() => setMonth((m) => addMonths(m, 1))}
          style={styles.monthButton}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LETTERS.map((letter, index) => (
          <Text key={`${letter}-${index}`} style={styles.weekday}>
            {letter}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate !== null && isSameDay(day, selectedDate);
          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              accessibilityLabel={format(day, 'EEEE d MMMM yyyy')}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(toDateKey(day))}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && !isSelected && styles.todayCircle,
                  isSelected && styles.selectedCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    !inMonth && styles.dayOutside,
                    isToday && !isSelected && styles.todayNumber,
                    isSelected && styles.selectedNumber,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  monthButton: {
    width: hitTarget,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { ...type.section, color: colors.ink, fontFamily: fontFamily.heading },
  weekRow: { flexDirection: 'row' },
  weekday: {
    ...type.overline,
    color: colors.inkFaint,
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { borderWidth: 1.5, borderColor: colors.accent },
  selectedCircle: { backgroundColor: colors.accent },
  dayNumber: { ...type.body, color: colors.ink },
  dayOutside: { color: colors.inkFaint, opacity: 0.45 },
  todayNumber: { color: colors.accent },
  selectedNumber: { color: colors.surface, fontWeight: '600' },
});
