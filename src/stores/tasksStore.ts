import { addDays, format } from 'date-fns';
import { create } from 'zustand';

import { getServices } from '@/services';
import type { Task } from '@/domain/types';
import type { TaskUpdate } from '@/repositories/tasks';
import { useUiStore } from '@/stores/uiStore';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const WRITE_FAILED = "Couldn't save — try again";

interface TasksState {
  status: LoadStatus;
  error: string | null;
  tasks: Task[];
  load: () => Promise<void>;
  createTask: (title: string) => Promise<Task>;
  updateTask: (id: string, patch: TaskUpdate) => Promise<void>;
  completeTask: (id: string) => Promise<Task | null>;
  uncompleteTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  scheduleTomorrow: (id: string) => Promise<void>;
  clearSchedule: (id: string) => Promise<void>;
}

async function withWriteError<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    useUiStore.getState().showToast({ message: WRITE_FAILED });
    throw error;
  }
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
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async createTask(title) {
    const task = await withWriteError(getServices().tasks.create({ title }));
    set((state) => ({ tasks: [task, ...state.tasks] }));
    return task;
  },

  async updateTask(id, patch) {
    await withWriteError(getServices().tasks.update(id, patch));
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  async completeTask(id) {
    const task = get().tasks.find((t) => t.id === id) ?? null;
    await withWriteError(getServices().tasks.complete(id, Date.now()));
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    return task;
  },

  async uncompleteTask(id) {
    await withWriteError(getServices().tasks.uncomplete(id));
    await get().load();
  },

  async removeTask(id) {
    await withWriteError(getServices().tasks.remove(id));
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
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
  },

  async clearSchedule(id) {
    const patch: TaskUpdate = { scheduledDate: null, startTime: null, durationMin: null };
    await withWriteError(getServices().tasks.update(id, patch));
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  },
}));
