import { create } from 'zustand';

import { toDateKey, todayKey } from '@/domain/calendar';
import { addDaysKey } from '@/domain/habits';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  duration: number;
  onAction?: () => void;
}

interface ShowToastInput {
  message: string;
  actionLabel?: string;
  duration?: number;
  onAction?: () => void;
}

interface UiState {
  now: Date;
  /** Date key currently viewed on Today (date navigation, D4/FR-D2). */
  viewDate: string;
  toast: Toast | null;
  refreshNow: () => void;
  setViewDate: (dateKey: string) => void;
  shiftViewDate: (deltaDays: number) => void;
  goToday: () => void;
  showToast: (input: ShowToastInput) => void;
  dismissToast: () => void;
}

let toastSeq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  now: new Date(),
  viewDate: toDateKey(new Date()),
  toast: null,

  refreshNow() {
    set({ now: new Date() });
  },

  setViewDate(dateKey) {
    set({ viewDate: dateKey });
  },

  shiftViewDate(deltaDays) {
    set((s) => ({ viewDate: addDaysKey(s.viewDate, deltaDays) }));
  },

  goToday() {
    set({ viewDate: todayKey(new Date()) });
  },

  showToast(input) {
    if (timer) clearTimeout(timer);
    const toast: Toast = {
      id: ++toastSeq,
      message: input.message,
      actionLabel: input.actionLabel,
      duration: input.duration ?? 5000,
      onAction: input.onAction,
    };
    set({ toast });
    timer = setTimeout(() => {
      set({ toast: null });
      timer = null;
    }, toast.duration);
  },

  dismissToast() {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ toast: null });
  },
}));
