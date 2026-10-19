import { create } from 'zustand';

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
  toast: Toast | null;
  refreshNow: () => void;
  showToast: (input: ShowToastInput) => void;
  dismissToast: () => void;
}

let toastSeq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  now: new Date(),
  toast: null,

  refreshNow() {
    set({ now: new Date() });
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
