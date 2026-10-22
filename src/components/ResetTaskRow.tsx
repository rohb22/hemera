import DateTimePicker, {
  type DateTimePickerChangeEvent,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { toTimeKey } from '@/domain/calendar';
import type { ResetChoice } from '@/domain/reset';
import type { Task } from '@/domain/types';
import { colors, radii, spacing, type } from '@/theme/tokens';

/**
 * One row of the Reset My Day review (v1.2, FR-X3): the task, when it
 * was scheduled for, and the four choices it can land on. Every row
 * starts on "Keep time" (D23).
 */

const FALLBACK = parseISO('2021-01-01T09:00:00');

interface ResetTaskRowProps {
  task: Task;
  caption: string | null;
  choice: ResetChoice;
  onChoose: (taskId: string, choice: ResetChoice) => void;
}

interface ChipProps {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, accessibilityLabel, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ResetTaskRow({ task, caption, choice, onChoose }: ResetTaskRowProps) {
  const [picking, setPicking] = useState(false);

  const keepTime = task.startTime ?? '';
  const picked = choice.time ?? keepTime;

  const pickerValue = choice.time
    ? parseISO(`2021-01-01T${choice.time}:00`)
    : keepTime
      ? parseISO(`2021-01-01T${keepTime}:00`)
      : FALLBACK;

  const handlePicked = (
    _event: DateTimePickerChangeEvent | DateTimePickerEvent,
    date: Date,
  ) => {
    if (Platform.OS === 'android') setPicking(false);
    onChoose(task.id, { action: 'pick', time: toTimeKey(date) });
  };

  const handleDismiss = () => setPicking(false);

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>

      <View style={styles.chips}>
        <Chip
          label={`Keep ${keepTime}`}
          accessibilityLabel={`Keep ${keepTime}`}
          selected={choice.action === 'keep'}
          onPress={() => onChoose(task.id, { action: 'keep' })}
        />
        <Chip
          label="Move to pool"
          accessibilityLabel="Move to the pool"
          selected={choice.action === 'pool'}
          onPress={() => onChoose(task.id, { action: 'pool' })}
        />
        <Chip
          label={choice.action === 'pick' ? `Pick ${picked}` : 'Pick new time'}
          accessibilityLabel={choice.action === 'pick' ? `Pick ${picked}` : 'Pick a new time'}
          selected={choice.action === 'pick'}
          onPress={() => setPicking(true)}
        />
        <Chip
          label="Dismiss"
          accessibilityLabel="Dismiss"
          selected={choice.action === 'dismiss'}
          onPress={() => onChoose(task.id, { action: 'dismiss' })}
        />
      </View>

      {Platform.OS === 'android' && picking && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="clock"
          onValueChange={handlePicked}
          onDismiss={handleDismiss}
        />
      )}
      {Platform.OS !== 'android' && picking && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="spinner"
          onValueChange={handlePicked}
          style={styles.spinner}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  head: { gap: 2 },
  title: { ...type.body, color: colors.ink },
  caption: { ...type.caption, color: colors.inkMuted },
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
  chipText: { ...type.caption, color: colors.ink, fontWeight: '600' },
  chipTextSelected: { color: colors.surface },
  pressed: { opacity: 0.85 },
  spinner: { alignSelf: 'center' },
});
