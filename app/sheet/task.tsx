import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/PrimaryButton';
import { MiniCalendar } from '@/components/MiniCalendar';
import { TimeField } from '@/components/TimeField';
import { useTasksStore } from '@/stores/tasksStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

const DURATION_CHIPS = [15, 30, 60, 90];

interface Errors {
  title?: string;
  schedule?: string;
  deadline?: string;
  duration?: string;
}

export default function TaskSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTasksStore((s) => s.tasks.find((t) => t.id === id));
  const updateTask = useTasksStore((s) => s.updateTask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [schedDate, setSchedDate] = useState<string | null>(task?.scheduledDate ?? null);
  const [schedTime, setSchedTime] = useState<string | null>(task?.startTime ?? null);
  const [duration, setDuration] = useState(task?.durationMin ?? 30);
  const [customDuration, setCustomDuration] = useState(
    task?.durationMin && !DURATION_CHIPS.includes(task.durationMin) ? String(task.durationMin) : '',
  );
  const [deadlineDate, setDeadlineDate] = useState<string | null>(task?.deadlineDate ?? null);
  const [deadlineTime, setDeadlineTime] = useState<string | null>(task?.deadlineTime ?? null);
  const [showSchedCal, setShowSchedCal] = useState(false);
  const [showDeadlineCal, setShowDeadlineCal] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const durationLabel = useMemo(() => {
    if (DURATION_CHIPS.includes(duration)) return `${duration} min`;
    return customDuration ? `${customDuration} min` : '30 min';
  }, [duration, customDuration]);

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>This task is no longer available.</Text>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const save = async () => {
    const nextErrors: Errors = {};
    const trimmed = title.trim();
    if (!trimmed) nextErrors.title = 'Add a title.';
    if (schedDate && !schedTime) nextErrors.schedule = 'Add a start time to schedule this task.';
    if (deadlineTime && !deadlineDate) nextErrors.deadline = 'Add a due date first.';
    let durationMin: number | null = null;
    if (schedDate && schedTime) {
      if (customDuration.trim()) {
        const parsed = Number(customDuration);
        if (!Number.isInteger(parsed) || parsed < 5 || parsed > 1440) {
          nextErrors.duration = 'Use 5–1440 minutes.';
        } else {
          durationMin = parsed;
        }
      } else {
        durationMin = duration;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await updateTask(task.id, {
        title: trimmed,
        notes,
        scheduledDate: schedDate,
        startTime: schedDate ? schedTime : null,
        durationMin,
        deadlineDate,
        deadlineTime,
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
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
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional details"
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, styles.notes]}
            multiline
            maxLength={2000}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

          <Text style={styles.label}>Date</Text>
          <View style={styles.rowBetween}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={schedDate ? `Scheduled ${schedDate}` : 'No scheduled date'}
              onPress={() => setShowSchedCal((open) => !open)}
              style={[styles.field, styles.fieldButton]}
            >
              <Text style={[styles.fieldText, !schedDate && styles.placeholder]}>
                {schedDate ? format(parseISO(schedDate), 'EEE d MMM yyyy') : 'Not scheduled'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.inkMuted} />
            </Pressable>
            {schedDate && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear scheduled date"
                hitSlop={spacing.sm}
                onPress={() => {
                  setSchedDate(null);
                  setSchedTime(null);
                }}
                style={styles.clear}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
          {showSchedCal && (
            <MiniCalendar
              selected={schedDate}
              onSelect={(dateKey) => {
                setSchedDate(dateKey);
                setShowSchedCal(false);
              }}
            />
          )}
          {errors.schedule && <Text style={styles.error}>{errors.schedule}</Text>}

          {schedDate && (
            <>
              <Text style={styles.label}>Start time</Text>
              <TimeField value={schedTime} onChange={setSchedTime} />

              <Text style={styles.label}>Duration</Text>
              <View style={styles.chips}>
                {DURATION_CHIPS.map((minutes) => {
                  const selected = !customDuration.trim() && duration === minutes;
                  return (
                    <Pressable
                      key={minutes}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setDuration(minutes);
                        setCustomDuration('');
                        setErrors((e) => ({ ...e, duration: undefined }));
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {minutes} min
                      </Text>
                    </Pressable>
                  );
                })}
                <View style={[styles.chip, styles.chipCustom]}>
                  <TextInput
                    value={customDuration}
                    onChangeText={(text) => {
                      setCustomDuration(text.replace(/[^0-9]/g, ''));
                      setErrors((e) => ({ ...e, duration: undefined }));
                    }}
                    keyboardType="number-pad"
                    placeholder="Custom"
                    placeholderTextColor={colors.inkFaint}
                    style={styles.customInput}
                    maxLength={4}
                  />
                </View>
              </View>
              {errors.duration && <Text style={styles.error}>{errors.duration}</Text>}
              <Text style={styles.hint}>{durationLabel}</Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deadline</Text>

          <Text style={styles.label}>Due date</Text>
          <View style={styles.rowBetween}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={deadlineDate ? `Due ${deadlineDate}` : 'No deadline'}
              onPress={() => setShowDeadlineCal((open) => !open)}
              style={[styles.field, styles.fieldButton]}
            >
              <Text style={[styles.fieldText, !deadlineDate && styles.placeholder]}>
                {deadlineDate ? format(parseISO(deadlineDate), 'EEE d MMM yyyy') : 'No deadline'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.inkMuted} />
            </Pressable>
            {deadlineDate && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear deadline"
                hitSlop={spacing.sm}
                onPress={() => {
                  setDeadlineDate(null);
                  setDeadlineTime(null);
                }}
                style={styles.clear}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
          {showDeadlineCal && (
            <MiniCalendar
              selected={deadlineDate}
              onSelect={(dateKey) => {
                setDeadlineDate(dateKey);
                setShowDeadlineCal(false);
              }}
            />
          )}
          {errors.deadline && <Text style={styles.error}>{errors.deadline}</Text>}

          {deadlineDate && (
            <>
              <Text style={styles.label}>Time (optional — leave unset for all-day)</Text>
              <TimeField value={deadlineTime} onChange={setDeadlineTime} />
            </>
          )}
        </View>

        <Button label="Save" onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.huge,
  },
  fieldGroup: { gap: spacing.sm },
  section: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.lg,
  },
  sectionTitle: { ...type.section, color: colors.ink, marginBottom: spacing.xs },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  fieldButton: { backgroundColor: colors.surface },
  fieldText: { ...type.body, color: colors.ink },
  placeholder: { color: colors.inkFaint },
  clear: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  clearText: { ...type.button, color: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipCustom: { paddingHorizontal: spacing.sm, minWidth: 84 },
  chipText: { ...type.caption, color: colors.ink, fontWeight: '600' },
  chipTextSelected: { color: colors.surface },
  customInput: { ...type.caption, color: colors.ink, minWidth: 56, textAlign: 'center' },
  hint: { ...type.caption, color: colors.inkFaint },
  error: { ...type.caption, color: colors.attention },
  missing: { ...type.body, color: colors.inkMuted },
});
