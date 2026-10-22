import { openDatabase } from '@/db/open';
import { createHabitsRepository } from '@/repositories/habits';
import { createResetsRepository } from '@/repositories/resets';
import { createSettingsRepository } from '@/repositories/settings';
import { createTasksRepository } from '@/repositories/tasks';
import { setServices } from '@/services';
import { configureHandler, ensureChannel } from '@/services/reminders';
import { syncReminders } from '@/stores/reminderSync';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export async function bootstrap(): Promise<void> {
  const db = await openDatabase();
  setServices({
    tasks: createTasksRepository(db),
    habits: createHabitsRepository(db),
    settings: createSettingsRepository(db),
    resets: createResetsRepository(db),
  });
  useUiStore.getState().refreshNow();
  await useSettingsStore.getState().load();
  // D13: the OS trigger set can drift while the app is closed (day rollover,
  // timezone change, a reboot), so reconcile it once per launch. Never fatal.
  configureHandler();
  await ensureChannel();
  void syncReminders();
}
