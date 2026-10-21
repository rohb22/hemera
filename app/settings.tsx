import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { DEFAULT_HABIT_REMINDER_TIME } from '@/repositories/settings';
import { parseReminderTime } from '@/domain/reminders';
import { requestPermission } from '@/services/reminders';
import type { WeekStartsOn } from '@/domain/habits';
import { useSettingsStore } from '@/stores/settingsStore';
import { refreshPermission, syncReminders } from '@/stores/reminderSync';
import { colors, radii, spacing, type } from '@/theme/tokens';

const WEEK_START_OPTIONS: { label: string; value: WeekStartsOn }[] = [
  { label: 'Monday', value: 1 },
  { label: 'Sunday', value: 0 },
];

/** `HH:mm` → a Date carrying just that time of day (for the native wheel). */
function timeToDate(hhmm: string): Date {
  const minutes = parseReminderTime(hhmm) ?? parseReminderTime(DEFAULT_HABIT_REMINDER_TIME) ?? 1200;
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useSettingsStore((s) => s.setWeekStartsOn);
  const taskRemindersEnabled = useSettingsStore((s) => s.taskRemindersEnabled);
  const habitRemindersEnabled = useSettingsStore((s) => s.habitRemindersEnabled);
  const habitReminderTime = useSettingsStore((s) => s.habitReminderTime);
  const permission = useSettingsStore((s) => s.permission);
  const setPermission = useSettingsStore((s) => s.setPermission);
  const setTaskReminders = useSettingsStore((s) => s.setTaskReminders);
  const setHabitReminders = useSettingsStore((s) => s.setHabitReminders);
  const setHabitReminderTime = useSettingsStore((s) => s.setHabitReminderTime);
  const dismissReminderHint = useSettingsStore((s) => s.dismissReminderHint);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // D16: read the permission without prompting; the prompt only ever comes
  // from toggling a switch.
  useEffect(() => {
    void refreshPermission();
  }, []);

  // D18: opening this screen counts as seeing the reminder hint.
  useEffect(() => {
    void dismissReminderHint();
  }, [dismissReminderHint]);

  const onPickWeekStart = async (value: WeekStartsOn) => {
    if (value === weekStartsOn) return;
    try {
      await setWeekStartsOn(value);
    } catch {
      // toast shown by the store
    }
  };

  /** D16: enabling asks once; a refusal leaves the switch off, silently. */
  const onToggleReminders = async (kind: 'tasks' | 'habits', next: boolean) => {
    if (!next) {
      try {
        if (kind === 'tasks') await setTaskReminders(false);
        else await setHabitReminders(false);
        await syncReminders();
      } catch {
        // toast shown by the store
      }
      return;
    }

    const state = permission === 'granted' ? 'granted' : await requestPermission();
    setPermission(state);
    if (state !== 'granted') return;

    try {
      if (kind === 'tasks') await setTaskReminders(true);
      else await setHabitReminders(true);
      await syncReminders();
    } catch {
      // toast shown by the store
    }
  };

  const onPickTime = async (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (event.type !== 'set' || !date) return;
    try {
      await setHabitReminderTime(dateToTime(date));
      await syncReminders();
    } catch {
      // toast shown by the store
    }
  };

  const permissionBlocked = permission === 'denied';

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text style={styles.overline}>Week starts on</Text>
          <View style={styles.card}>
            {WEEK_START_OPTIONS.map((option, index) => {
              const selected = weekStartsOn === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Week starts on ${option.label}`}
                  onPress={() => void onPickWeekStart(option.value)}
                  style={[styles.row, index > 0 && styles.rowDivider]}
                >
                  <Text style={styles.rowLabel}>{option.label}</Text>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Affects habit weeks and the date picker.</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.overline}>Reminders</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLabelFlex}>
                <Text style={styles.rowLabel}>Task reminders</Text>
                <Text style={styles.rowCaption}>When a scheduled task starts.</Text>
              </View>
              <Switch
                accessibilityLabel="Task reminders"
                value={taskRemindersEnabled}
                onValueChange={(next) => void onToggleReminders('tasks', next)}
                trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }}
                thumbColor={taskRemindersEnabled ? colors.accent : colors.surface}
              />
            </View>

            <View style={[styles.row, styles.rowDivider]}>
              <View style={styles.rowLabelFlex}>
                <Text style={styles.rowLabel}>Habit reminders</Text>
                <Text style={styles.rowCaption}>One nudge a day for what’s left.</Text>
              </View>
              <Switch
                accessibilityLabel="Habit reminders"
                value={habitRemindersEnabled}
                onValueChange={(next) => void onToggleReminders('habits', next)}
                trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }}
                thumbColor={habitRemindersEnabled ? colors.accent : colors.surface}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !habitRemindersEnabled }}
              accessibilityLabel={`Habit reminder time, ${habitReminderTime}`}
              disabled={!habitRemindersEnabled}
              onPress={() => setShowTimePicker(true)}
              style={[styles.row, styles.rowDivider, !habitRemindersEnabled && styles.rowDisabled]}
            >
              <View style={styles.rowLabelFlex}>
                <Text style={[styles.rowLabel, !habitRemindersEnabled && styles.mutedLabel]}>
                  Reminder time
                </Text>
                {!habitRemindersEnabled && (
                  <Text style={styles.rowCaption}>Turn on habit reminders first.</Text>
                )}
              </View>
              <Text style={[styles.rowValue, !habitRemindersEnabled && styles.mutedLabel]}>
                {habitReminderTime}
              </Text>
            </Pressable>
          </View>
          {permissionBlocked && (
            <Text style={styles.hint}>
              Notifications are off for Hemera.{' '}
              <Text style={styles.link} onPress={() => void Linking.openSettings()}>
                Open system settings
              </Text>
            </Text>
          )}
          {!permissionBlocked && (
            <Text style={styles.hint}>Reminders are local to this device. Nothing is sent anywhere.</Text>
          )}
        </View>

        {showTimePicker && (
          <DateTimePicker
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={timeToDate(habitReminderTime)}
            onChange={(event, date) => void onPickTime(event, date)}
          />
        )}

        <View style={styles.group}>
          <Text style={styles.overline}>Habits</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Archived habits"
              onPress={() => router.push('/archived-habits')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowLabel}>Archived habits</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </Pressable>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.overline}>Data</Text>
          <View style={styles.card}>
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Export, coming later"
              style={styles.row}
            >
              <View style={styles.rowLabelFlex}>
                <Text style={[styles.rowLabel, styles.mutedLabel]}>Export</Text>
                <Text style={styles.rowCaption}>Coming later — nothing leaves your device.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.overline}>About</Text>
          <Text style={styles.aboutName}>Hemera</Text>
          <Text style={styles.hint}>
            Your day, one at a time. All data stays on this device.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xxl },
  group: { gap: spacing.sm },
  overline: { ...type.overline, color: colors.inkMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowDisabled: { opacity: 0.6 },
  rowLabel: { ...type.body, color: colors.ink },
  rowLabelFlex: { flex: 1 },
  rowValue: { ...type.body, color: colors.accent, fontVariant: ['tabular-nums'] },
  mutedLabel: { color: colors.inkMuted },
  rowCaption: { ...type.caption, color: colors.inkFaint },
  pressed: { opacity: 0.85 },
  hint: { ...type.caption, color: colors.inkMuted },
  link: { color: colors.accent, fontWeight: '600' },
  aboutName: { ...type.title, color: colors.ink },
});
