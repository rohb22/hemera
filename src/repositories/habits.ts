import { AppError } from '@/lib/errors';
import { newId } from '@/lib/ids';
import type { SqlExecutor } from '@/db/adapter';
import type { Habit, HabitOccurrence, NewHabitInput, OccurrenceState } from '@/domain/types';

interface HabitRow {
  id: string;
  name: string;
  days_mask: number;
  created_at: number;
  archived_at: number | null;
}

interface OccurrenceRow {
  habit_id: string;
  date: string;
  state: OccurrenceState;
  updated_at: number;
}

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    daysMask: row.days_mask,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function mapOccurrence(row: OccurrenceRow): HabitOccurrence {
  return {
    habitId: row.habit_id,
    date: row.date,
    state: row.state,
    updatedAt: row.updated_at,
  };
}

export interface HabitsRepositoryDeps {
  newId?: () => string;
  now?: () => number;
}

export interface HabitUpdate {
  name?: string;
  daysMask?: number;
}

const UPDATE_COLUMNS: Record<keyof HabitUpdate, string> = {
  name: 'name',
  daysMask: 'days_mask',
};

export type HabitsRepository = ReturnType<typeof createHabitsRepository>;

export function createHabitsRepository(db: SqlExecutor, deps: HabitsRepositoryDeps = {}) {
  const generateId = deps.newId ?? newId;
  const now = deps.now ?? Date.now;

  return {
    async create(input: NewHabitInput): Promise<Habit> {
      const habit: Habit = {
        id: generateId(),
        name: input.name.trim(),
        daysMask: input.daysMask,
        createdAt: now(),
        archivedAt: null,
      };
      try {
        await db.run(
          `INSERT INTO habits (id, name, days_mask, created_at, archived_at)
           VALUES (?, ?, ?, ?, ?)`,
          [habit.id, habit.name, habit.daysMask, habit.createdAt, habit.archivedAt],
        );
      } catch (error) {
        throw new AppError('write', 'Failed to create the habit', { cause: error });
      }
      return habit;
    },

    async getById(id: string): Promise<Habit | null> {
      const rows = await db.all<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
      return rows[0] ? mapHabit(rows[0]) : null;
    },

    async listActive(): Promise<Habit[]> {
      const rows = await db.all<HabitRow>(
        'SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at DESC',
      );
      return rows.map(mapHabit);
    },

    async listArchived(): Promise<Habit[]> {
      const rows = await db.all<HabitRow>(
        'SELECT * FROM habits WHERE archived_at IS NOT NULL ORDER BY archived_at DESC',
      );
      return rows.map(mapHabit);
    },

    async update(id: string, patch: HabitUpdate): Promise<void> {
      const sets: string[] = [];
      const params: (string | number | null)[] = [];
      for (const [key, column] of Object.entries(UPDATE_COLUMNS) as [keyof HabitUpdate, string][]) {
        if (key in patch) {
          sets.push(`${column} = ?`);
          params.push(patch[key] ?? null);
        }
      }
      if (sets.length === 0) return;
      params.push(id);
      await db.run(`UPDATE habits SET ${sets.join(', ')} WHERE id = ?`, params);
    },

    async archive(id: string): Promise<void> {
      await db.run('UPDATE habits SET archived_at = ? WHERE id = ?', [now(), id]);
    },

    async restore(id: string): Promise<void> {
      await db.run('UPDATE habits SET archived_at = NULL WHERE id = ?', [id]);
    },

    async getOccurrences(habitId: string): Promise<HabitOccurrence[]> {
      const rows = await db.all<OccurrenceRow>(
        'SELECT * FROM habit_occurrences WHERE habit_id = ? ORDER BY date',
        [habitId],
      );
      return rows.map(mapOccurrence);
    },

    /** Upsert — occurrence rows are never deleted (R2, ADR-0007). */
    async setOccurrence(
      habitId: string,
      date: string,
      state: OccurrenceState,
    ): Promise<void> {
      await db.run(
        `INSERT INTO habit_occurrences (habit_id, date, state, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (habit_id, date)
         DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
        [habitId, date, state, now()],
      );
    },
  };
}
