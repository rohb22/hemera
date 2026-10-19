import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/db/adapter';
import type { SQLiteBindValue } from 'expo-sqlite';

type Bind = string | number | bigint | null | Uint8Array;

function toBind(params?: SQLiteBindValue[]): Bind[] {
  return (params ?? []).map((value) => {
    if (typeof value === 'boolean') return Number(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return value;
  });
}

export interface NodeSqlExecutor extends SqlExecutor {
  db: DatabaseSync;
}

export function createNodeSqlExecutor(): NodeSqlExecutor {
  const db = new DatabaseSync(':memory:');

  const executor: NodeSqlExecutor = {
    db,
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params) {
      db.prepare(sql).run(...toBind(params));
    },
    async all<T>(sql: string, params?: SQLiteBindValue[]) {
      return db.prepare(sql).all(...toBind(params)) as T[];
    },
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>) {
      db.exec('BEGIN');
      try {
        const result = await fn(executor);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return executor;
}
