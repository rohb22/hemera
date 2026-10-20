import { migrate, migrations } from '@/db/migrate';
import { createNodeSqlExecutor } from '../helpers/nodeSqlite';

async function tableNames(db: ReturnType<typeof createNodeSqlExecutor>): Promise<string[]> {
  const rows = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  return rows.map((row) => row.name);
}

describe('migrate (FR-P1, NFR-D)', () => {
  it('applies every migration to a fresh database and records it', async () => {
    const db = createNodeSqlExecutor();

    await migrate(db);

    const applied = await db.all<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version',
    );
    expect(applied.map((row) => row.version)).toEqual(migrations.map((m) => m.version));
    expect(await tableNames(db)).toEqual(
      expect.arrayContaining([
        'tasks',
        'habits',
        'habit_occurrences',
        'settings',
        'schema_migrations',
      ]),
    );
  });

  it('is idempotent — a second run applies nothing', async () => {
    const db = createNodeSqlExecutor();

    await migrate(db);
    await migrate(db);

    const applied = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
    expect(applied).toHaveLength(migrations.length);
  });

  it('leaves data from a prior build intact (upgrade path)', async () => {
    const db = createNodeSqlExecutor();
    await migrate(db);

    await db.run(
      `INSERT INTO tasks (id, title, notes, created_at) VALUES ('t1', 'Old task', '', 1)`,
    );
    await db.run(
      `INSERT INTO habits (id, name, days_mask, created_at) VALUES ('h1', 'Old habit', 127, 1)`,
    );
    await db.run(
      `INSERT INTO habit_occurrences (habit_id, date, state, updated_at) VALUES ('h1', '2026-10-19', 'done', 1)`,
    );
    await db.run(`INSERT INTO settings (key, value) VALUES ('week_start', '0')`);

    await migrate(db);

    expect(await db.all('SELECT id FROM tasks')).toHaveLength(1);
    expect(await db.all('SELECT id FROM habits')).toHaveLength(1);
    expect(await db.all('SELECT date FROM habit_occurrences')).toHaveLength(1);
    const setting = await db.all<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'week_start'`,
    );
    expect(setting[0]?.value).toBe('0');
  });
});
