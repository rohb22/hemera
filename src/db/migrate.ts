import type { SqlExecutor } from './adapter';
import * as migration001 from './migrations/001_initial';
import * as migration002 from './migrations/002_day_resets';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  { version: migration001.version, name: migration001.name, sql: migration001.sql },
  { version: migration002.version, name: migration002.name, sql: migration002.sql },
];

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);`;

export async function migrate(db: SqlExecutor): Promise<void> {
  await db.exec(CREATE_MIGRATIONS_TABLE);
  const rows = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.version));

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        Date.now(),
      ]);
    });
  }
}
