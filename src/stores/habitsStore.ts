import { create } from 'zustand';

import { getServices } from '@/services';
import type { Habit, HabitOccurrence, NewHabitInput, OccurrenceState } from '@/domain/types';
import type { HabitUpdate } from '@/repositories/habits';
import { withWriteError } from '@/lib/writeError';
import type { LoadStatus } from '@/stores/tasksStore';

interface HabitsState {
  status: LoadStatus;
  error: string | null;
  habits: Habit[];
  occurrences: HabitOccurrence[];
  archived: Habit[];
  archivedError: string | null;
  load: () => Promise<void>;
  loadArchived: () => Promise<void>;
  createHabit: (input: NewHabitInput) => Promise<Habit>;
  updateHabit: (id: string, patch: HabitUpdate) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  restoreHabit: (id: string) => Promise<void>;
  setOccurrence: (habitId: string, dateKey: string, state: OccurrenceState) => Promise<void>;
}

function upsertOccurrence(
  occurrences: HabitOccurrence[],
  row: HabitOccurrence,
): HabitOccurrence[] {
  const others = occurrences.filter(
    (o) => !(o.habitId === row.habitId && o.date === row.date),
  );
  return [...others, row];
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  status: 'idle',
  error: null,
  habits: [],
  occurrences: [],
  archived: [],
  archivedError: null,

  async load() {
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      const { habits: repo } = getServices();
      const habits = await repo.listActive();
      const occurrences: HabitOccurrence[] = [];
      for (const habit of habits) {
        occurrences.push(...(await repo.getOccurrences(habit.id)));
      }
      set({ habits, occurrences, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async createHabit(input) {
    const habit = await withWriteError(getServices().habits.create(input));
    set((state) => ({ habits: [habit, ...state.habits] }));
    return habit;
  },

  async updateHabit(id, patch) {
    await withWriteError(getServices().habits.update(id, patch));
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  },

  async archiveHabit(id) {
    await withWriteError(getServices().habits.archive(id));
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
      occurrences: state.occurrences.filter((o) => o.habitId !== id),
    }));
  },

  async loadArchived() {
    try {
      const archived = await getServices().habits.listArchived();
      set({ archived, archivedError: null });
    } catch (error) {
      set({
        archivedError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async restoreHabit(id) {
    await withWriteError(getServices().habits.restore(id));
    const habit = await getServices().habits.getById(id);
    set((state) => ({
      archived: state.archived.filter((h) => h.id !== id),
      habits: habit
        ? [...state.habits.filter((h) => h.id !== id), habit].sort(
            (a, b) => b.createdAt - a.createdAt,
          )
        : state.habits,
    }));
  },

  async setOccurrence(habitId, dateKey, state) {
    await withWriteError(getServices().habits.setOccurrence(habitId, dateKey, state));
    set((s) => ({
      occurrences: upsertOccurrence(s.occurrences, {
        habitId,
        date: dateKey,
        state,
        updatedAt: Date.now(),
      }),
    }));
  },
}));
