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
