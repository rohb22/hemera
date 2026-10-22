import {
  HABIT_NUDGE_ID,
  HABIT_NUDGE_TITLE,
  habitNudgeBody,
  nextHabitNudgeDate,
  reminderDiff,
  wantedReminders,
  type ReminderSyncInput,
} from '@/domain/reminders';
import { toDateKey } from '@/domain/calendar';
import {
  cancelById,
  ensureChannel,
  getPermission,
  listScheduled,
  scheduleHabitNudge,
  scheduleTaskNotification,
} from '@/services/reminders';
import { useHabitsStore } from '@/stores/habitsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * D13: reconcile the OS-scheduled triggers with current data. Runs after
 * every mutation that can affect a reminder, and once on launch.
 *
 * Lives outside the stores so `tasksStore`/`habitsStore` can call it
 * without creating an import cycle.
 */

let running = false;
let queued = false;

const REMINDER_FAILED = "Couldn't update reminders";
const HABIT_NUDGE_FALLBACK = 'Habits today';

export async function syncReminders(): Promise<void> {
  // Coalesce bursts (a load issues several mutations in a row).
  if (running) {
    queued = true;
    return;
  }
  running = true;
  try {
    do {
      queued = false;
      await runSync();
    } while (queued);
  } finally {
    running = false;
  }
}

async function runSync(): Promise<void> {
  const settings = useSettingsStore.getState();
  const enabled = settings.taskRemindersEnabled || settings.habitRemindersEnabled;

  const permission = await getPermission();
  if (settings.permission !== permission) settings.setPermission(permission);

  const installed = (await listScheduled()).map((item) => item.identifier);

  const input: ReminderSyncInput = {
    tasks: enabled ? useTasksStore.getState().tasks : [],
    habits: enabled ? useHabitsStore.getState().habits : [],
    occurrences: enabled ? useHabitsStore.getState().occurrences : [],
    taskRemindersEnabled: settings.taskRemindersEnabled,
    habitRemindersEnabled: settings.habitRemindersEnabled,
    habitTime: settings.habitReminderTime,
    permission,
    now: new Date(),
  };

  const wanted = wantedReminders(input);
  const diff = reminderDiff(installed, wanted);

  // Every operation is isolated: one failure (an OS that refuses a
  // trigger, a revoked permission) must not abort the rest of the
  // reconciliation, and must never block a task or habit write.
  let failed = false;

  try {
    await ensureChannel();
  } catch {
    failed = true;
  }

  for (const id of diff.cancel) {
    try {
      await cancelById(id);
    } catch {
      failed = true;
    }
  }

  for (const task of diff.schedule) {
    try {
      await scheduleTaskNotification({
        id: task.id,
        title: task.title,
        date: task.date,
        taskId: task.taskId,
      });
    } catch {
      failed = true;
    }
  }

  if (wanted.habit) {
    try {
      await scheduleHabitNudge(
        wanted.habit.id,
        wanted.habit.title,
        wanted.habit.body,
        wanted.habit.date,
      );
    } catch {
      failed = true;
    }
  } else if (
    permission === 'granted' &&
    input.habitRemindersEnabled &&
    !installed.includes(HABIT_NUDGE_ID) &&
    !diff.cancel.includes(HABIT_NUDGE_ID)
  ) {
    // Today's slot has passed (or nothing is outstanding): keep the daily
    // nudge alive by re-arming it for tomorrow (FR-R3). The body reflects
    // the habits outstanding *today*, which is what the user will review
    // when the nudge fires tomorrow morning's equivalent moment.
    const date = nextHabitNudgeDate(input.habitTime, input.now);
    if (date) {
      // Re-arming keeps the daily nudge alive; the body is refreshed by
      // the next sync once the habits for that day are known.
      const body =
        habitNudgeBody(input.habits, input.occurrences, toDateKey(input.now)) ?? HABIT_NUDGE_FALLBACK;
      try {
        await scheduleHabitNudge(HABIT_NUDGE_ID, HABIT_NUDGE_TITLE, body, date);
      } catch {
        failed = true;
      }
    }
  }

  if (failed) {
    // Reminders are decoration on top of committed data: a failure is
    // reported, but it never blocks a task or habit write.
    useUiStore.getState().showToast({ message: REMINDER_FAILED });
  }
}

/** Re-read the OS permission without prompting (D16). */
export async function refreshPermission(): Promise<void> {
  const permission = await getPermission();
  if (useSettingsStore.getState().permission !== permission) {
    useSettingsStore.getState().setPermission(permission);
  }
}
