import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { dayIndexesFromMask, maskFromDayIndexes, plannedDayNames } from '@/domain/habits';
import { useHabitsStore } from '@/stores/habitsStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface Errors {
  name?: string;
  days?: string;
}

export default function HabitSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const habit = useHabitsStore((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
  const createHabit = useHabitsStore((s) => s.createHabit);
  const updateHabit = useHabitsStore((s) => s.updateHabit);

  const isEdit = !!habit;
  const [name, setName] = useState(habit?.name ?? '');
  const [days, setDays] = useState<number[]>(
    habit ? dayIndexesFromMask(habit.daysMask) : ALL_DAYS,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const toggleDay = (dayIndex: number) => {
    setDays((current) =>
      current.includes(dayIndex)
        ? current.filter((d) => d !== dayIndex)
        : [...current, dayIndex].sort((a, b) => a - b),
    );
    setErrors((e) => ({ ...e, days: undefined }));
  };

  const save = async () => {
    const nextErrors: Errors = {};
    if (!name.trim()) nextErrors.name = 'Add a name.';
    if (days.length === 0) nextErrors.days = 'Pick at least one day.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const daysMask = maskFromDayIndexes(days);
      if (habit) await updateHabit(habit.id, { name: name.trim(), daysMask });
      else await createHabit({ name: name.trim(), daysMask });
      router.back();
    } catch {
      setSaving(false);
    }
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
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              autoFocus={!isEdit}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="What do you want to keep up?"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, errors.name && styles.inputError]}
              maxLength={100}
            />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Planned days</Text>
            <DayToggles days={days} onToggle={toggleDay} />
            {errors.days ? (
              <Text style={styles.error}>{errors.days}</Text>
            ) : (
              <Text style={styles.hint}>
                {days.length === 7 ? 'Every day' : plannedDayNames(maskFromDayIndexes(days))}
              </Text>
            )}
          </View>

          <Text style={styles.note}>
            Planned days are a guide — any day can still be checked off.
          </Text>

          <Button label={isEdit ? 'Save' : 'Create habit'} onPress={save} disabled={saving} />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputError: { borderColor: colors.attention },
  hint: { ...type.caption, color: colors.inkFaint },
  note: { ...type.caption, color: colors.inkMuted },
  error: { ...type.caption, color: colors.attention },
});
