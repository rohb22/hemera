import { useRouter } from 'expo-router';
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
import { DeadlineFields } from '@/components/DeadlineFields';
import { ScheduleFields } from '@/components/ScheduleFields';
import {
  emptyDraft,
  taskDraftPayload,
  validateTaskDraft,
  type TaskDraft,
  type TaskDraftErrors,
} from '@/lib/taskDraft';
import { useTasksStore } from '@/stores/tasksStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

export default function QuickAddSheet() {
  const router = useRouter();
  const createTask = useTasksStore((s) => s.createTask);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [errors, setErrors] = useState<TaskDraftErrors>({});
  const [saving, setSaving] = useState(false);

  const trimmed = draft.title.trim();
  const canSave = trimmed.length > 0 && !saving;

  const save = async () => {
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

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              autoFocus
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
              value={draft.notes}
              onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
              placeholder="Optional details"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, styles.notes]}
              multiline
              maxLength={2000}
            />
          </View>

          <Button label="Save" onPress={save} disabled={!canSave} />
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
  error: { ...type.caption, color: colors.attention },
});
