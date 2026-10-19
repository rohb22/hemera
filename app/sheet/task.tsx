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
import { DeadlineFields } from '@/components/DeadlineFields';
import { ScheduleFields } from '@/components/ScheduleFields';
import {
  draftFromTask,
  emptyDraft,
  taskDraftPayload,
  validateTaskDraft,
  type TaskDraft,
  type TaskDraftErrors,
} from '@/lib/taskDraft';
import { useTasksStore } from '@/stores/tasksStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

export default function TaskSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTasksStore((s) => s.tasks.find((t) => t.id === id));
  const updateTask = useTasksStore((s) => s.updateTask);

  const [draft, setDraft] = useState<TaskDraft>(() =>
    task ? draftFromTask(task) : emptyDraft(),
  );
  const [errors, setErrors] = useState<TaskDraftErrors>({});
  const [saving, setSaving] = useState(false);

  if (!task) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.missingContainer}>
          <Text style={styles.missing}>This task is no longer available.</Text>
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const save = async () => {
    const nextErrors = validateTaskDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await updateTask(task.id, taskDraftPayload(draft));
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
              placeholder="What needs doing?"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, errors.title && styles.inputError]}
              maxLength={200}
            />
            {errors.title && <Text style={styles.error}>{errors.title}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={draft.notes}
              onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
              placeholder="Optional details"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, styles.notes]}
              multiline
              maxLength={2000}
            />
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

          <Button label="Save" onPress={save} disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  missingContainer: {
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.xl,
  },
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
  notes: { minHeight: 88, textAlignVertical: 'top' },
  error: { ...type.caption, color: colors.attention },
  missing: { ...type.body, color: colors.inkMuted },
});
