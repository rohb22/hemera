import { create } from 'zustand';

import type { WeekStartsOn } from '@/domain/habits';
import { withWriteError } from '@/lib/writeError';
import { getServices } from '@/services';
import type { LoadStatus } from '@/stores/tasksStore';

interface SettingsState {
  status: LoadStatus;
  error: string | null;
  weekStartsOn: WeekStartsOn;
  load: () => Promise<void>;
  setWeekStartsOn: (value: WeekStartsOn) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  status: 'idle',
  error: null,
  weekStartsOn: 1,

  async load() {
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      const value = await getServices().settings.getWeekStartsOn();
      set({ weekStartsOn: value, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async setWeekStartsOn(value) {
    await withWriteError(getServices().settings.setWeekStartsOn(value));
    set({ weekStartsOn: value });
  },
}));
