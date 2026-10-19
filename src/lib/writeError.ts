import { useUiStore } from '@/stores/uiStore';

export const WRITE_FAILED = "Couldn't save — try again";

export async function withWriteError<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    useUiStore.getState().showToast({ message: WRITE_FAILED });
    throw error;
  }
}
