import type { SqlExecutor } from '@/db/adapter';
import type { WeekStartsOn } from '@/domain/habits';
import { AppError } from '@/lib/errors';

const WEEK_START_KEY = 'week_start';
const REMINDER_TASKS_KEY = 'reminder_tasks_enabled';
const REMINDER_HABITS_KEY = 'reminder_habits_enabled';
const REMINDER_HABIT_TIME_KEY = 'reminder_habit_time';
const REMINDER_HINT_KEY = 'reminder_hint_seen';

/** Default habit nudge time (A16). */
export const DEFAULT_HABIT_REMINDER_TIME = '20:00';

export interface ReminderSettings {
  tasks: boolean;
  habits: boolean;
  habitTime: string;
  hintSeen: boolean;
}

export interface SettingsRepository {
  getWeekStartsOn(): Promise<WeekStartsOn>;
  setWeekStartsOn(value: WeekStartsOn): Promise<void>;
  getReminders(): Promise<ReminderSettings>;
  setReminderTasks(enabled: boolean): Promise<void>;
  setReminderHabits(enabled: boolean): Promise<void>;
  setHabitReminderTime(hhmm: string): Promise<void>;
  setReminderHintSeen(seen: boolean): Promise<void>;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `HH:mm` → minutes from midnight, or null when malformed. */
function parseTime(hhmm: string): number | null {
  const match = TIME_PATTERN.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Lenient: an unparsable stored value falls back to the default (A16). */
function normalizeTime(value: string | undefined): string {
  if (!value) return DEFAULT_HABIT_REMINDER_TIME;
  return parseTime(value) === null ? DEFAULT_HABIT_REMINDER_TIME : value;
}

export function createSettingsRepository(db: SqlExecutor): SettingsRepository {
  async function read(key: string): Promise<string | undefined> {
    const rows = await db.all<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0]?.value;
  }

  async function write(key: string, value: string): Promise<void> {
    await db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  return {
    async getWeekStartsOn() {
      const value = await read(WEEK_START_KEY);
      // A3 default: Monday.
      return value === '0' ? 0 : 1;
    },

    async setWeekStartsOn(value) {
      if (value !== 0 && value !== 1) {
        throw new AppError('write', 'Invalid week start value');
      }
      await write(WEEK_START_KEY, String(value));
    },

    async getReminders() {
      const [tasks, habits, habitTime, hintSeen] = await Promise.all([
        read(REMINDER_TASKS_KEY),
        read(REMINDER_HABITS_KEY),
        read(REMINDER_HABIT_TIME_KEY),
        read(REMINDER_HINT_KEY),
      ]);
      // D14: both switches start off, so nothing is scheduled and no
      // permission is requested until the user opts in.
      return {
        tasks: tasks === '1',
        habits: habits === '1',
        habitTime: normalizeTime(habitTime),
        hintSeen: hintSeen === '1',
      };
    },

    async setReminderTasks(enabled) {
      await write(REMINDER_TASKS_KEY, enabled ? '1' : '0');
    },

    async setReminderHabits(enabled) {
      await write(REMINDER_HABITS_KEY, enabled ? '1' : '0');
    },

    async setHabitReminderTime(hhmm) {
      if (parseTime(hhmm) === null) {
        throw new AppError('write', 'Invalid reminder time');
      }
      await write(REMINDER_HABIT_TIME_KEY, hhmm);
    },

    async setReminderHintSeen(seen) {
      await write(REMINDER_HINT_KEY, seen ? '1' : '0');
    },
  };
}
