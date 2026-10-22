import { create } from 'zustand';

import type { ResetPlanEntry } from '@/domain/reset';
import { withWriteError } from '@/lib/writeError';
import { getServices } from '@/services';
import { useTasksStore } from '@/stores/tasksStore';

export interface ResetOutcome {
  resetId: string;
  changed: number;
}

interface ResetState {
  applying: boolean;
  /** Apply a reset and refresh the tasks the review moved. */
  apply: (entries: ResetPlanEntry[], dateKey: string) => Promise<ResetOutcome | null>;
  /** Restore a reset from the history and reload the tasks. */
  undo: (resetId: string) => Promise<void>;
}

/**
 * Reset My Day (v1.2, D26).
 *
 * The write itself lives in the repository (one transaction); this
 * store keeps the in-memory tasks in step with it and re-syncs the
 * reminders, because a task that moved to today may need a new trigger
 * and a task that moved to the pool must lose its old one (FR-X6).
 */
export const useResetStore = create<ResetState>((set) => ({
  applying: false,

  async apply(entries, dateKey) {
    set({ applying: true });
    try {
      const outcome = await withWriteError(getServices().resets.apply(entries, dateKey));

      const byId = new Map(entries.map((entry) => [entry.taskId, entry]));
      useTasksStore.setState((state) => ({
        tasks: state.tasks.map((task) => {
          const entry = byId.get(task.id);
          if (!entry) return task;
          return {
            ...task,
            scheduledDate: entry.to.scheduledDate,
            startTime: entry.to.startTime,
            durationMin: entry.to.durationMin,
          };
        }),
      }));

      await syncRemindersSafely();
      return outcome;
    } catch {
      return null;
    } finally {
      set({ applying: false });
    }
  },

  async undo(resetId) {
    await withWriteError(getServices().resets.undo(resetId));
    // The undo restores from the database, so re-read the tasks rather
    // than patching them in memory.
    await useTasksStore.getState().load();
  },
}));

/**
 * Reminders never block a reset (FR-X6): a failed sync is reported by
 * the sync layer itself. The import is deferred so the stores keep no
 * cycle.
 */
async function syncRemindersSafely(): Promise<void> {
  try {
    const module = await import('@/stores/reminderSync');
    await module.syncReminders();
  } catch {
    // already reported by the sync layer
  }
}
