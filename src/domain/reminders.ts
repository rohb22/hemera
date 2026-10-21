import { addDaysKey } from '@/domain/habits';
import { combineDateTimeKey, toDateKey } from '@/domain/calendar';
import type { Habit, HabitOccurrence, Task } from '@/domain/types';

/**
 * Pure reminder logic (FR-R2/R3, D13–D19). No `expo-*` imports — the
 * side effects live in `@/services/reminders`, so this stays
 * unit-testable under the Node test environment.
 */

/** D13: deterministic ids, so sync is idempotent and needs no stored map. */
export function taskReminderId(taskId: string): string {
  return `task:${taskId}`;
}

export const HABIT_NUDGE_ID = 'habit-nudge';
export const HABIT_NUDGE_TITLE = 'Habits today';

/** `HH:mm` → minutes from midnight; invalid input returns null. */
export function parseReminderTime(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const toHhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * FR-R2: a reminder exists only for an open task that is scheduled with a
 * start time, and only while that moment is still ahead.
 */
export function taskReminderDate(task: Task, now: Date): Date | null {
  if (task.status !== 'open') return null;
  if (!task.scheduledDate || !task.startTime) return null;
  const date = combineDateTimeKey(task.scheduledDate, task.startTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() > now.getTime() ? date : null;
}

/** The habit nudge fires at the chosen time today, if that moment is ahead. */
export function habitNudgeDate(time: string, now: Date): Date | null {
  const minutes = parseReminderTime(time);
  if (minutes === null) return null;
  const date = combineDateTimeKey(toDateKey(now), toHhmm(minutes));
  return date.getTime() > now.getTime() ? date : null;
}

/** Same time tomorrow — used when today's slot has already passed. */
export function nextHabitNudgeDate(time: string, now: Date): Date | null {
  const minutes = parseReminderTime(time);
  if (minutes === null) return null;
  return combineDateTimeKey(addDaysKey(toDateKey(now), 1), toHhmm(minutes));
}

/**
 * FR-R3: names the habits still outstanding today. Returns null when there
 * is nothing to say, so the nudge is silenced rather than sent with an
 * empty body.
 *
 * D17 limitation: computed when the trigger is installed, not at fire
 * time — the OS cannot ask us "is it done yet?" without an unreliable
 * background task.
 */
export function habitNudgeBody(
  habits: Habit[],
  occurrences: HabitOccurrence[],
  dateKey: string,
): string | null {
  const stateByHabit = new Map(
    occurrences.filter((o) => o.date === dateKey).map((o) => [o.habitId, o.state]),
  );
  const outstanding = habits
    .filter((habit) => habit.archivedAt === null)
    .filter((habit) => {
      const state = stateByHabit.get(habit.id);
      return state !== 'done' && state !== 'skipped';
    })
    .map((habit) => habit.name.trim())
    .filter((name) => name.length > 0);

  if (outstanding.length === 0) return null;
  return outstanding.join(', ');
}

export interface WantedTaskReminder {
  id: string;
  taskId: string;
  title: string;
  date: Date;
}

export interface WantedReminders {
  tasks: WantedTaskReminder[];
  habit: { id: string; title: string; body: string; date: Date } | null;
}

export interface ReminderSyncInput {
  tasks: Task[];
  habits: Habit[];
  occurrences: HabitOccurrence[];
  taskRemindersEnabled: boolean;
  habitRemindersEnabled: boolean;
  habitTime: string;
  permission: 'granted' | 'denied' | 'undetermined';
  now: Date;
}

/** The complete set of triggers the app wants installed right now. */
export function wantedReminders(input: ReminderSyncInput): WantedReminders {
  const granted = input.permission === 'granted';

  const tasks: WantedTaskReminder[] = [];
  if (granted && input.taskRemindersEnabled) {
    for (const task of input.tasks) {
      const date = taskReminderDate(task, input.now);
      if (date) tasks.push({ id: taskReminderId(task.id), taskId: task.id, title: task.title, date });
    }
  }

  let habit: WantedReminders['habit'] = null;
  if (granted && input.habitRemindersEnabled) {
    const date = habitNudgeDate(input.habitTime, input.now);
    const body = habitNudgeBody(input.habits, input.occurrences, toDateKey(input.now));
    if (date && body) {
      habit = { id: HABIT_NUDGE_ID, title: HABIT_NUDGE_TITLE, body, date };
    }
  }

  return { tasks, habit };
}

/**
 * D13 reconciliation: what to cancel and what to install so the OS ends up
 * holding exactly the wanted set.
 */
export function reminderDiff(
  installed: string[],
  wanted: WantedReminders,
): { cancel: string[]; schedule: WantedTaskReminder[] } {
  const wantedIds = new Set<string>([
    ...wanted.tasks.map((task) => task.id),
    ...(wanted.habit ? [wanted.habit.id] : []),
  ]);
  return {
    cancel: installed.filter((id) => !wantedIds.has(id)),
    schedule: wanted.tasks,
  };
}
