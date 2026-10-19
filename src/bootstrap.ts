import { openDatabase } from '@/db/open';
import { createHabitsRepository } from '@/repositories/habits';
import { createTasksRepository } from '@/repositories/tasks';
import { setServices } from '@/services';
import { useUiStore } from '@/stores/uiStore';

export async function bootstrap(): Promise<void> {
  const db = await openDatabase();
  setServices({
    tasks: createTasksRepository(db),
    habits: createHabitsRepository(db),
  });
  useUiStore.getState().refreshNow();
}
