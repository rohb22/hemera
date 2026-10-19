import { openDatabase } from '@/db/open';
import { createTasksRepository } from '@/repositories/tasks';
import { setServices } from '@/services';
import { useUiStore } from '@/stores/uiStore';

export async function bootstrap(): Promise<void> {
  const db = await openDatabase();
  setServices({ tasks: createTasksRepository(db) });
  useUiStore.getState().refreshNow();
}
