import { openDatabase } from '@/db/open';
import { createHabitsRepository } from '@/repositories/habits';
import { createSettingsRepository } from '@/repositories/settings';
import { createTasksRepository } from '@/repositories/tasks';
import { setServices } from '@/services';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export async function bootstrap(): Promise<void> {
  const db = await openDatabase();
  setServices({
    tasks: createTasksRepository(db),
    habits: createHabitsRepository(db),
    settings: createSettingsRepository(db),
  });
  useUiStore.getState().refreshNow();
  await useSettingsStore.getState().load();
}
