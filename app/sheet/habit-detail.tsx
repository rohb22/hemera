import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/PrimaryButton';
import { HabitDayCells, HabitStateShape } from '@/components/HabitDayCells';
import { toDateKey, todayKey } from '@/domain/calendar';
import {
  lastNWeekStarts,
  plannedDayNames,
  progressCaption,
  weekDates,
  weekStartFor,
  weeklyProgress,
  type HabitDayState,
} from '@/domain/habits';
import type { HabitOccurrence } from '@/domain/types';
import { useHabitsStore } from '@/stores/habitsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

const LEGEND: { state: HabitDayState; label: string }[] = [
  { state: 'done', label: 'done' },
  { state: 'skipped', label: 'skipped' },
  { state: 'missed', label: 'missed' },
  { state: 'pending', label: 'not yet' },
];

const EMPTY_OCCURRENCES: HabitOccurrence[] = [];

export default function HabitDetailSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabitsStore((s) => s.habits.find((h) => h.id === id));
  const occurrences = useHabitsStore((s) => s.occurrences);
  const setOccurrence = useHabitsStore((s) => s.setOccurrence);
  const archiveHabit = useHabitsStore((s) => s.archiveHabit);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const now = useUiStore((s) => s.now);

  const today = todayKey(now);

  const habitOccurrences = useMemo(() => {
    if (!habit) return EMPTY_OCCURRENCES;
    return occurrences.filter((o) => o.habitId === habit.id);
  }, [habit, occurrences]);

  if (!habit) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.missingContainer}>
          <Text style={styles.missing}>This habit is no longer available.</Text>
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const weekStart = weekStartFor(today, weekStartsOn);
  const progress = weeklyProgress(
    habit.daysMask,
    habitOccurrences,
    weekStart,
    toDateKey(new Date(habit.createdAt)),
  );
  const weekStarts = lastNWeekStarts(today, 4, weekStartsOn);

  const todayRow = habitOccurrences.find((o) => o.date === today);
  const todaySkipped = todayRow?.state === 'skipped';

  const onSkip = async () => {
    try {
      await setOccurrence(habit.id, today, todaySkipped ? 'pending' : 'skipped');
    } catch {
      // toast shown by the store
    }
  };

  const onArchive = () => {
    Alert.alert(
      `Archive “${habit.name}”?`,
      'Its history is kept — you can restore it later from Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archiveHabit(habit.id)
              .then(() => router.back())
              .catch(() => {
                // toast shown by the store
              });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.name}>{habit.name}</Text>

          <View style={styles.group}>
            <Text style={styles.overline}>This week</Text>
            <View style={styles.sentenceRow}>
              <Text style={styles.sentence}>{progressCaption(progress)}</Text>
              {progress.met && <Text style={styles.met}>· target met</Text>}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.overline}>Planned days</Text>
            <Text style={styles.sentence}>
              {habit.daysMask === 127 ? 'Every day' : plannedDayNames(habit.daysMask)}
            </Text>
          </View>

          <Button
            label={todaySkipped ? 'Undo skip' : 'Skip today'}
            variant="secondary"
            onPress={() => void onSkip()}
          />

          <View style={styles.group}>
            <Text style={styles.overline}>Last 4 weeks</Text>
            {weekStarts.map((startKey) => (
              <View key={startKey} style={styles.weekBlock}>
                <Text style={styles.weekLabel}>Week of {format(parseISO(startKey), 'd MMM')}</Text>
                <HabitDayCells
                  habit={habit}
                  weekDates={weekDates(startKey)}
                  todayKey={today}
                  occurrences={habitOccurrences}
                />
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            {LEGEND.map((entry) => (
              <View key={entry.label} style={styles.legendItem}>
                <HabitStateShape state={entry.state} />
                <Text style={styles.legendLabel}>{entry.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="secondary"
              style={styles.flex}
              onPress={() =>
                router.push({ pathname: '/sheet/habit', params: { id: habit.id } })
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Archive ${habit.name}`}
              onPress={onArchive}
              style={({ pressed }) => [styles.archive, pressed && styles.pressed]}
            >
              <Text style={styles.archiveText}>Archive</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  container: {
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.huge,
  },
  name: { ...type.title, color: colors.ink },
  group: { gap: spacing.sm },
  overline: { ...type.overline, color: colors.inkMuted },
  sentenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sentence: { ...type.body, color: colors.ink },
  met: { ...type.caption, color: colors.accent, fontWeight: '600' },
  weekBlock: {
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
  },
  weekLabel: { ...type.caption, color: colors.inkFaint },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendLabel: { ...type.caption, color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  archive: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.85 },
  archiveText: { ...type.button, color: colors.danger },
  missing: { ...type.body, color: colors.inkMuted },
  missingContainer: {
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.xl,
  },
});
