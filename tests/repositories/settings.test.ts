import { migrate } from '@/db/migrate';
import { createSettingsRepository } from '@/repositories/settings';
import { createNodeSqlExecutor } from '../helpers/nodeSqlite';

async function setup() {
  const db = createNodeSqlExecutor();
  await migrate(db);
  return createSettingsRepository(db);
}

describe('settingsRepository (FR-S1)', () => {
  it('defaults to Monday when unset (A3)', async () => {
    const repo = await setup();
    expect(await repo.getWeekStartsOn()).toBe(1);
  });

  it('persists and reads back the week start', async () => {
    const repo = await setup();
    await repo.setWeekStartsOn(0);
    expect(await repo.getWeekStartsOn()).toBe(0);
    await repo.setWeekStartsOn(1);
    expect(await repo.getWeekStartsOn()).toBe(1);
  });

  it('upserts a single row for the key', async () => {
    const db = createNodeSqlExecutor();
    await migrate(db);
    const repo = createSettingsRepository(db);

    await repo.setWeekStartsOn(0);
    await repo.setWeekStartsOn(1);
    await repo.setWeekStartsOn(0);

    const rows = await db.all<{ key: string }>('SELECT key FROM settings');
    expect(rows).toHaveLength(1);
  });
});

describe('settingsRepository reminders (FR-R1, D14)', () => {
  it('defaults to both switches off, 20:00, hint unseen', async () => {
    const repo = await setup();
    expect(await repo.getReminders()).toEqual({
      tasks: false,
      habits: false,
      habitTime: '20:00',
      hintSeen: false,
    });
  });

  it('persists each reminder preference', async () => {
    const repo = await setup();
    await repo.setReminderTasks(true);
    await repo.setReminderHabits(true);
    await repo.setHabitReminderTime('07:15');
    await repo.setReminderHintSeen(true);

    expect(await repo.getReminders()).toEqual({
      tasks: true,
      habits: true,
      habitTime: '07:15',
      hintSeen: true,
    });

    await repo.setReminderTasks(false);
    expect((await repo.getReminders()).tasks).toBe(false);
  });

  it('rejects a malformed reminder time', async () => {
    const repo = await setup();
    await expect(repo.setHabitReminderTime('25:00')).rejects.toThrow();
    await expect(repo.setHabitReminderTime('8:00')).rejects.toThrow();
  });

  it('falls back to the default when a stored time is unreadable', async () => {
    const db = createNodeSqlExecutor();
    await migrate(db);
    const repo = createSettingsRepository(db);
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['reminder_habit_time', 'nonsense']);

    expect((await repo.getReminders()).habitTime).toBe('20:00');
  });
});
