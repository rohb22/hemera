import { addDays, format } from 'date-fns';
import { create } from 'zustand';

import { getServices } from '@/services';
import type { NewTaskInput, Task } from '@/domain/types';
import type { TaskUpdate } from '@/repositories/tasks';
import { withWriteError } from '@/lib/writeError';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TasksState {
  status: LoadStatus;
  error: string | null;
  tasks: Task[];
  load: () => Promise<void>;
  createTask: (input: NewTaskInput) => Promise<Task>;
  updateTask: (id: string, patch: TaskUpdate) => Promise<void>;
  completeTask: (id: string) => Promise<Task | null>;
  uncompleteTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  scheduleTomorrow: (id: string) => Promise<void>;
  clearSchedule: (id: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  status: 'idle',
  error: null,
  tasks: [],

  async load() {
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      const tasks = await getServices().tasks.listOpen();
      set({ tasks, status: 'ready', error: null });
      // D13: the reminder set may have drifted while the app was closed
      // (or the day rolled over). Deferred to avoid an import cycle.
      void import('@/stores/reminderSync').then((m) => m.syncReminders());
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async createTask(input) {
    const task = await withWriteError(getServices().tasks.create(input));
    set((state) => ({ tasks: [task, ...state.tasks] }));
    await syncRemindersSafely();
    return task;
  },

  async updateTask(id, patch) {
    await withWriteError(getServices().tasks.update(id, patch));
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    await syncRemindersSafely();
  },

  async completeTask(id) {
    const task = get().tasks.find((t) => t.id === id) ?? null;
    await withWriteError(getServices().tasks.complete(id, Date.now()));
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    await syncRemindersSafely();
    return task;
  },

  async uncompleteTask(id) {
    await withWriteError(getServices().tasks.uncomplete(id));
    await get().load();
  },

  async removeTask(id) {
    await withWriteError(getServices().tasks.remove(id));
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    await syncRemindersSafely();
  },

  async scheduleTomorrow(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const patch: TaskUpdate = {
      scheduledDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      startTime: task.startTime,
      durationMin: task.durationMin,
    };
    await withWriteError(getServices().tasks.update(id, patch));
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    await syncRemindersSafely();
  },

  async clearSchedule(id) {
    const patch: TaskUpdate = { scheduledDate: null, startTime: null, durationMin: null };
    await withWriteError(getServices().tasks.update(id, patch));
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    await syncRemindersSafely();
  },
}));

/**
 * FR-R2/D13: every task write can change which reminders should exist.
 * Reminders never block the write itself (see `reminderSync`), and the
 * import stays deferred so the stores keep no cycle.
 */
async function syncRemindersSafely(): Promise<void> {
  try {
    const module = await import('@/stores/reminderSync');
    await module.syncReminders();
  } catch {
    // already reported by the sync layer
  }
}
