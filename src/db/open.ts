import { openDatabaseAsync } from 'expo-sqlite';

import { AppError } from '@/lib/errors';
import { createExpoSqlExecutor, type SqlExecutor } from './adapter';
import { migrate } from './migrate';

export const DATABASE_NAME = 'hemera.db';

export async function openDatabase(): Promise<SqlExecutor> {
  try {
    const db = await openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    const executor = createExpoSqlExecutor(db);
    await migrate(executor);
    return executor;
  } catch (error) {
    throw new AppError('migration', 'Could not open or prepare the database', { cause: error });
  }
}
