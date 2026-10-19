import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SQLiteBindValue[]): Promise<void>;
  all<T>(sql: string, params?: SQLiteBindValue[]): Promise<T[]>;
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

export function createExpoSqlExecutor(db: SQLiteDatabase): SqlExecutor {
  const executor: SqlExecutor = {
    async exec(sql) {
      await db.execAsync(sql);
    },
    async run(sql, params) {
      await db.runAsync(sql, params ?? []);
    },
    async all<T>(sql: string, params?: SQLiteBindValue[]) {
      return db.getAllAsync<T>(sql, params ?? []);
    },
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>) {
      let result: T | undefined;
      await db.withTransactionAsync(async () => {
        result = await fn(executor);
      });
      return result as T;
    },
  };
  return executor;
}
