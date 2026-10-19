import type { SqlExecutor } from '@/db/adapter';
import type { WeekStartsOn } from '@/domain/habits';
import { AppError } from '@/lib/errors';

const WEEK_START_KEY = 'week_start';

export interface SettingsRepository {
  getWeekStartsOn(): Promise<WeekStartsOn>;
  setWeekStartsOn(value: WeekStartsOn): Promise<void>;
}

export function createSettingsRepository(db: SqlExecutor): SettingsRepository {
  return {
    async getWeekStartsOn() {
      const rows = await db.all<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [WEEK_START_KEY],
      );
      // A3 default: Monday.
      return rows[0]?.value === '0' ? 0 : 1;
    },

    async setWeekStartsOn(value) {
      if (value !== 0 && value !== 1) {
        throw new AppError('write', 'Invalid week start value');
      }
      await db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [WEEK_START_KEY, String(value)],
      );
    },
  };
}
