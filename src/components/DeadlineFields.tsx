import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MiniCalendar } from '@/components/MiniCalendar';
import { TimeField } from '@/components/TimeField';
import type { TaskDraftErrors } from '@/lib/taskDraft';
import { colors, radii, spacing, type } from '@/theme/tokens';

export interface DeadlineValue {
  deadlineDate: string | null;
  deadlineTime: string | null;
}

interface DeadlineFieldsProps {
  value: DeadlineValue;
  onChange: (next: DeadlineValue) => void;
  errors?: TaskDraftErrors;
}

export function DeadlineFields({ value, onChange, errors }: DeadlineFieldsProps) {
  const [showCal, setShowCal] = useState(false);
  const { deadlineDate, deadlineTime } = value;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Deadline</Text>

      <Text style={styles.label}>Due date</Text>
      <View style={styles.rowBetween}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deadlineDate ? `Due ${deadlineDate}` : 'No deadline'}
          onPress={() => setShowCal((open) => !open)}
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
            onPress={() => onChange({ deadlineDate: null, deadlineTime: null })}
            style={styles.clear}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>
      {showCal && (
        <MiniCalendar
          selected={deadlineDate}
          onSelect={(dateKey) => {
            onChange({ deadlineDate: dateKey, deadlineTime });
            setShowCal(false);
          }}
        />
      )}
      {errors?.deadline && <Text style={styles.error}>{errors.deadline}</Text>}

      {deadlineDate && (
        <>
          <Text style={styles.label}>Time (optional — leave unset for all-day)</Text>
          <TimeField
            value={deadlineTime}
            onChange={(deadlineTime) => onChange({ deadlineDate, deadlineTime })}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.lg,
  },
  sectionTitle: { ...type.section, color: colors.ink, marginBottom: spacing.xs },
  label: { ...type.overline, color: colors.inkMuted },
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
  error: { ...type.caption, color: colors.attention },
});
