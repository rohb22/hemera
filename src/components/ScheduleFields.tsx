import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MiniCalendar } from '@/components/MiniCalendar';
import { TimeField } from '@/components/TimeField';
import { DURATION_CHIPS, type TaskDraftErrors } from '@/lib/taskDraft';
import { colors, radii, spacing, type } from '@/theme/tokens';

export interface ScheduleValue {
  schedDate: string | null;
  schedTime: string | null;
  durationMin: number;
  customDuration: string;
}

interface ScheduleFieldsProps {
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
  errors?: TaskDraftErrors;
}

export function ScheduleFields({ value, onChange, errors }: ScheduleFieldsProps) {
  const [showCal, setShowCal] = useState(false);
  const { schedDate, schedTime, durationMin, customDuration } = value;

  const durationLabel = DURATION_CHIPS.includes(durationMin)
    ? `${durationMin} min`
    : customDuration
      ? `${customDuration} min`
      : '30 min';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Schedule</Text>

      <Text style={styles.label}>Date</Text>
      <View style={styles.rowBetween}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={schedDate ? `Scheduled ${schedDate}` : 'No scheduled date'}
          onPress={() => setShowCal((open) => !open)}
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
            onPress={() => onChange({ ...value, schedDate: null, schedTime: null })}
            style={styles.clear}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>
      {showCal && (
        <MiniCalendar
          selected={schedDate}
          onSelect={(dateKey) => {
            onChange({ ...value, schedDate: dateKey });
            setShowCal(false);
          }}
        />
      )}
      {errors?.schedule && <Text style={styles.error}>{errors.schedule}</Text>}

      {schedDate && (
        <>
          <Text style={styles.label}>Start time</Text>
          <TimeField
            value={schedTime}
            onChange={(schedTime) => onChange({ ...value, schedTime })}
          />

          <Text style={styles.label}>Duration</Text>
          <View style={styles.chips}>
            {DURATION_CHIPS.map((minutes) => {
              const selected = !customDuration.trim() && durationMin === minutes;
              return (
                <Pressable
                  key={minutes}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onChange({ ...value, durationMin: minutes, customDuration: '' })}
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
                onChangeText={(text) =>
                  onChange({ ...value, customDuration: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="number-pad"
                placeholder="Custom"
                placeholderTextColor={colors.inkFaint}
                style={styles.customInput}
                maxLength={4}
              />
            </View>
          </View>
          {errors?.duration && <Text style={styles.error}>{errors.duration}</Text>}
          <Text style={styles.hint}>{durationLabel}</Text>
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
});
