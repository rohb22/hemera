import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/PrimaryButton';
import { DayToggles } from '@/components/DayToggles';
import { DeadlineFields } from '@/components/DeadlineFields';
import { ScheduleFields } from '@/components/ScheduleFields';
import { maskFromDayIndexes, plannedDayNames } from '@/domain/habits';
import {
  emptyDraft,
  taskDraftPayload,
  validateTaskDraft,
  type TaskDraft,
  type TaskDraftErrors,
} from '@/lib/taskDraft';
import { useHabitsStore } from '@/stores/habitsStore';
import { useTasksStore } from '@/stores/tasksStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

type Mode = 'task' | 'habit';

interface HabitErrors {
  name?: string;
  days?: string;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function QuickAddSheet() {
  const router = useRouter();
  // The presenting tab picks the mode: Today → task, Habits → habit (FR-A1 revision).
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const activeMode: Mode = mode === 'habit' ? 'habit' : 'task';
  const createTask = useTasksStore((s) => s.createTask);
  const createHabit = useHabitsStore((s) => s.createHabit);

  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [errors, setErrors] = useState<TaskDraftErrors>({});
  const [habitName, setHabitName] = useState('');
  const [habitDays, setHabitDays] = useState<number[]>(ALL_DAYS);
  const [habitErrors, setHabitErrors] = useState<HabitErrors>({});
  const [saving, setSaving] = useState(false);

  const trimmed = draft.title.trim();

  const saveTask = async () => {
    const nextErrors = validateTaskDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await createTask(taskDraftPayload(draft));
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  const saveHabit = async () => {
    const nextErrors: HabitErrors = {};
    if (!habitName.trim()) nextErrors.name = 'Add a name.';
    if (habitDays.length === 0) nextErrors.days = 'Pick at least one day.';
    setHabitErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await createHabit({
        name: habitName.trim(),
        daysMask: maskFromDayIndexes(habitDays),
      });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  const save = () => {
    if (activeMode === 'habit') void saveHabit();
    else void saveTask();
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
          {activeMode === 'task' ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  autoFocus
                  accessibilityLabel="Title"
                  value={draft.title}
                  onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
                  placeholder="What needs doing?"
                  placeholderTextColor={colors.inkFaint}
                  style={[styles.input, errors.title && styles.inputError]}
                  returnKeyType="done"
                  maxLength={200}
                  onSubmitEditing={save}
                />
                {errors.title && <Text style={styles.error}>{errors.title}</Text>}
              </View>

              <ScheduleFields
                value={{
                  schedDate: draft.schedDate,
                  schedTime: draft.schedTime,
                  durationMin: draft.durationMin,
                  customDuration: draft.customDuration,
                }}
                onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
                errors={errors}
              />

              <DeadlineFields
                value={{ deadlineDate: draft.deadlineDate, deadlineTime: draft.deadlineTime }}
                onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
                errors={errors}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  accessibilityLabel="Notes"
                  value={draft.notes}
                  onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
                  placeholder="Optional details"
                  placeholderTextColor={colors.inkFaint}
                  style={[styles.input, styles.notes]}
                  multiline
                  maxLength={2000}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  autoFocus
                  accessibilityLabel="Habit name"
                  value={habitName}
                  onChangeText={(text) => {
                    setHabitName(text);
                    setHabitErrors((e) => ({ ...e, name: undefined }));
                  }}
                  placeholder="What do you want to keep up?"
                  placeholderTextColor={colors.inkFaint}
                  style={[styles.input, habitErrors.name && styles.inputError]}
                  maxLength={100}
                />
                {habitErrors.name && <Text style={styles.error}>{habitErrors.name}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Planned days</Text>
                <DayToggles
                  days={habitDays}
                  onToggle={(dayIndex) => {
                    setHabitDays((current) =>
                      current.includes(dayIndex)
                        ? current.filter((d) => d !== dayIndex)
                        : [...current, dayIndex].sort((a, b) => a - b),
                    );
                    setHabitErrors((e) => ({ ...e, days: undefined }));
                  }}
                />
                {habitErrors.days ? (
                  <Text style={styles.error}>{habitErrors.days}</Text>
                ) : (
                  <Text style={styles.hint}>
                    {habitDays.length === 7
                      ? 'Every day'
                      : plannedDayNames(maskFromDayIndexes(habitDays))}
                  </Text>
                )}
              </View>

              <Text style={styles.note}>
                Planned days are a guide — any day can still be checked off.
              </Text>
            </>
          )}

          <Button
            label="Save"
            onPress={save}
            disabled={saving || (activeMode === 'task' && trimmed.length === 0)}
          />
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
  fieldGroup: { gap: spacing.sm },
  label: { ...type.overline, color: colors.inkMuted },
  input: {
    ...type.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputError: { borderColor: colors.attention },
  notes: { minHeight: 88, textAlignVertical: 'top' },
  hint: { ...type.caption, color: colors.inkFaint },
  note: { ...type.caption, color: colors.inkMuted },
  error: { ...type.caption, color: colors.attention },
});
