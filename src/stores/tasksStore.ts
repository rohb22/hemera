import { create } from 'zustand';

import { getServices } from '@/services';
import type { Task } from '@/domain/types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TasksState {
  status: LoadStatus;
  error: string | null;
  pool: Task[];
  loadPool: () => Promise<void>;
  createTask: (title: string) => Promise<Task>;
  completeTask: (id: string) => Promise<Task | null>;
  uncompleteTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  status: 'idle',
  error: null,
  pool: [],

  async loadPool() {
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      const pool = await getServices().tasks.listPool();
      set({ pool, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async createTask(title) {
    const task = await getServices().tasks.create({ title });
    set((state) => ({ pool: [task, ...state.pool] }));
    return task;
  },

  async completeTask(id) {
    const task = get().pool.find((t) => t.id === id) ?? null;
    await getServices().tasks.complete(id, Date.now());
    set((state) => ({ pool: state.pool.filter((t) => t.id !== id) }));
    return task;
  },

  async uncompleteTask(id) {
    await getServices().tasks.uncomplete(id);
    await get().loadPool();
  },

  async removeTask(id) {
    await getServices().tasks.remove(id);
    set((state) => ({ pool: state.pool.filter((t) => t.id !== id) }));
  },
}));
