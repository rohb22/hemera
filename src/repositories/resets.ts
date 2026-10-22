import { AppError } from '@/lib/errors';
import { newId } from '@/lib/ids';
import type { SqlExecutor } from '@/db/adapter';
import type { ResetAction, ResetPlanEntry, ResetSchedule } from '@/domain/reset';

interface ResetRow {
  id: string;
  date: string;
  applied_at: number;
}

interface ResetItemRow {
  reset_id: string;
  task_id: string;
  action: ResetAction;
  from_date: string | null;
  from_time: string | null;
  from_duration: number | null;
  to_date: string | null;
  to_time: string | null;
  to_duration: number | null;
}

export interface ResetRecord {
  id: string;
  date: string;
  appliedAt: number;
}

export interface ResetItemRecord {
  taskId: string;
  action: ResetAction;
  from: ResetSchedule;
  to: ResetSchedule;
}

export interface AppliedReset {
  resetId: string;
  /** How many tasks the reset actually moved. */
  changed: number;
}

export interface ResetsRepositoryDeps {
  newId?: () => string;
  now?: () => number;
}

export type ResetsRepository = ReturnType<typeof createResetsRepository>;

/**
 * Reset My Day (v1.2, D26).
 *
 * A reset is applied in a single transaction: the task updates and the
 * history record either both land or neither does. The before-image
 * lives in the history, so Undo restores from the database rather than
 * from memory.
 */
export function createResetsRepository(db: SqlExecutor, deps: ResetsRepositoryDeps = {}) {
  const generateId = deps.newId ?? newId;
  const now = deps.now ?? Date.now;

  return {
    async apply(entries: ResetPlanEntry[], dateKey: string): Promise<AppliedReset> {
      const resetId = generateId();
      const appliedAt = now();
      const changed = entries.filter(
        (entry) =>
          entry.from.scheduledDate !== entry.to.scheduledDate ||
          entry.from.startTime !== entry.to.startTime ||
          entry.from.durationMin !== entry.to.durationMin,
      ).length;

      try {
        await db.transaction(async (tx) => {
          await tx.run(
            'INSERT INTO day_resets (id, date, applied_at) VALUES (?, ?, ?)',
            [resetId, dateKey, appliedAt],
          );

          for (const entry of entries) {
            if (
              entry.from.scheduledDate !== entry.to.scheduledDate ||
              entry.from.startTime !== entry.to.startTime ||
              entry.from.durationMin !== entry.to.durationMin
            ) {
              await tx.run(
                'UPDATE tasks SET scheduled_date = ?, start_time = ?, duration_min = ? WHERE id = ?',
                [entry.to.scheduledDate, entry.to.startTime, entry.to.durationMin, entry.taskId],
              );
            }
            await tx.run(
              `INSERT INTO day_reset_items
                 (reset_id, task_id, action, from_date, from_time, from_duration,
                  to_date, to_time, to_duration)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                resetId,
                entry.taskId,
                entry.action,
                entry.from.scheduledDate,
                entry.from.startTime,
                entry.from.durationMin,
                entry.to.scheduledDate,
                entry.to.startTime,
                entry.to.durationMin,
              ],
            );
          }
        });
      } catch (error) {
        throw new AppError('write', 'Failed to apply the day reset', { cause: error });
      }

      return { resetId, changed };
    },

    async undo(resetId: string): Promise<void> {
      try {
        await db.transaction(async (tx) => {
          const items = await tx.all<ResetItemRow>(
            'SELECT * FROM day_reset_items WHERE reset_id = ?',
            [resetId],
          );
          for (const item of items) {
            await tx.run(
              'UPDATE tasks SET scheduled_date = ?, start_time = ?, duration_min = ? WHERE id = ?',
              [item.from_date, item.from_time, item.from_duration, item.task_id],
            );
          }
          await tx.run('DELETE FROM day_reset_items WHERE reset_id = ?', [resetId]);
          await tx.run('DELETE FROM day_resets WHERE id = ?', [resetId]);
        });
      } catch (error) {
        throw new AppError('write', 'Failed to undo the day reset', { cause: error });
      }
    },

    async listFor(dateKey: string): Promise<ResetRecord[]> {
      const rows = await db.all<ResetRow>(
        'SELECT id, date, applied_at FROM day_resets WHERE date = ? ORDER BY applied_at DESC',
        [dateKey],
      );
      return rows.map((row) => ({ id: row.id, date: row.date, appliedAt: row.applied_at }));
    },

    async itemsFor(resetId: string): Promise<ResetItemRecord[]> {
      const rows = await db.all<ResetItemRow>(
        'SELECT * FROM day_reset_items WHERE reset_id = ? ORDER BY task_id',
        [resetId],
      );
      return rows.map((row) => ({
        taskId: row.task_id,
        action: row.action,
        from: {
          scheduledDate: row.from_date,
          startTime: row.from_time,
          durationMin: row.from_duration,
        },
        to: {
          scheduledDate: row.to_date,
          startTime: row.to_time,
          durationMin: row.to_duration,
        },
      }));
    },
  };
}
