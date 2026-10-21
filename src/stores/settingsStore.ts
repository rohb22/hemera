import { create } from 'zustand';

import { DEFAULT_HABIT_REMINDER_TIME } from '@/repositories/settings';
import type { WeekStartsOn } from '@/domain/habits';
import { withWriteError } from '@/lib/writeError';
import { getServices } from '@/services';
import type { PermissionState } from '@/services/reminders';
import type { LoadStatus } from '@/stores/tasksStore';

interface SettingsState {
  status: LoadStatus;
  error: string | null;
  weekStartsOn: WeekStartsOn;
  /** D14: both off until the user opts in from Settings. */
  taskRemindersEnabled: boolean;
  habitRemindersEnabled: boolean;
  habitReminderTime: string;
  /** D18: the one-time Today hint is dismissed once seen/tapped. */
  reminderHintSeen: boolean;
  /**
   * D16: last known OS permission. `null` means "not checked yet" — the
   * app never asks on its own, only when a switch is toggled.
   */
  permission: PermissionState | null;
  load: () => Promise<void>;
  setWeekStartsOn: (value: WeekStartsOn) => Promise<void>;
  setTaskReminders: (enabled: boolean) => Promise<void>;
  setHabitReminders: (enabled: boolean) => Promise<void>;
  setHabitReminderTime: (hhmm: string) => Promise<void>;
  setPermission: (value: PermissionState) => void;
  dismissReminderHint: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  status: 'idle',
  error: null,
  weekStartsOn: 1,
  taskRemindersEnabled: false,
  habitRemindersEnabled: false,
  habitReminderTime: DEFAULT_HABIT_REMINDER_TIME,
  reminderHintSeen: false,
  permission: null,

  async load() {
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      const services = getServices();
      const [weekStartsOn, reminders] = await Promise.all([
        services.settings.getWeekStartsOn(),
        services.settings.getReminders(),
      ]);
      set({
        weekStartsOn,
        taskRemindersEnabled: reminders.tasks,
        habitRemindersEnabled: reminders.habits,
        habitReminderTime: reminders.habitTime,
        reminderHintSeen: reminders.hintSeen,
        status: 'ready',
        error: null,
      });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async setWeekStartsOn(value) {
    await withWriteError(getServices().settings.setWeekStartsOn(value));
    set({ weekStartsOn: value });
  },

  async setTaskReminders(enabled) {
    await withWriteError(getServices().settings.setReminderTasks(enabled));
    set({ taskRemindersEnabled: enabled });
  },

  async setHabitReminders(enabled) {
    await withWriteError(getServices().settings.setReminderHabits(enabled));
    set({ habitRemindersEnabled: enabled });
  },

  async setHabitReminderTime(hhmm) {
    await withWriteError(getServices().settings.setHabitReminderTime(hhmm));
    set({ habitReminderTime: hhmm });
  },

  setPermission(value) {
    set({ permission: value });
  },

  async dismissReminderHint() {
    if (get().reminderHintSeen) return;
    await withWriteError(getServices().settings.setReminderHintSeen(true));
    set({ reminderHintSeen: true });
  },
}));
