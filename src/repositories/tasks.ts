import { AppError } from '@/lib/errors';
import { newId } from '@/lib/ids';
import type { SqlExecutor } from '@/db/adapter';
import type { NewTaskInput, Task, TaskStatus } from '@/domain/types';

interface TaskRow {
  id: string;
  title: string;
  notes: string;
  deadline_date: string | null;
  deadline_time: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  duration_min: number | null;
  status: TaskStatus;
  created_at: number;
  completed_at: number | null;
}

const COLUMNS = `id, title, notes, deadline_date, deadline_time, scheduled_date,
  start_time, duration_min, status, created_at, completed_at`;

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    deadlineDate: row.deadline_date,
    deadlineTime: row.deadline_time,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time,
    durationMin: row.duration_min,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export interface TasksRepositoryDeps {
  newId?: () => string;
  now?: () => number;
}

export interface TaskUpdate {
  title?: string;
  notes?: string;
  deadlineDate?: string | null;
  deadlineTime?: string | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  durationMin?: number | null;
}

const UPDATE_COLUMNS: Record<keyof TaskUpdate, string> = {
  title: 'title',
  notes: 'notes',
  deadlineDate: 'deadline_date',
  deadlineTime: 'deadline_time',
  scheduledDate: 'scheduled_date',
  startTime: 'start_time',
  durationMin: 'duration_min',
};

export type TasksRepository = ReturnType<typeof createTasksRepository>;

export function createTasksRepository(db: SqlExecutor, deps: TasksRepositoryDeps = {}) {
  const generateId = deps.newId ?? newId;
  const now = deps.now ?? Date.now;

  return {
    async create(input: NewTaskInput): Promise<Task> {
      const task: Task = {
        id: generateId(),
        title: input.title.trim(),
        notes: input.notes ?? '',
        deadlineDate: input.deadlineDate ?? null,
        deadlineTime: input.deadlineTime ?? null,
        scheduledDate: input.scheduledDate ?? null,
        startTime: input.startTime ?? null,
        durationMin: input.durationMin ?? null,
        status: 'open',
        createdAt: now(),
        completedAt: null,
      };
      try {
        await db.run(
          `INSERT INTO tasks (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            task.title,
            task.notes,
            task.deadlineDate,
            task.deadlineTime,
            task.scheduledDate,
            task.startTime,
            task.durationMin,
            task.status,
            task.createdAt,
            task.completedAt,
          ],
        );
      } catch (error) {
        throw new AppError('write', 'Failed to create the task', { cause: error });
      }
      return task;
    },

    async getById(id: string): Promise<Task | null> {
      const rows = await db.all<TaskRow>(`SELECT ${COLUMNS} FROM tasks WHERE id = ?`, [id]);
      return rows[0] ? mapTask(rows[0]) : null;
    },

    async listOpen(): Promise<Task[]> {
      const rows = await db.all<TaskRow>(
        `SELECT ${COLUMNS} FROM tasks
         WHERE status = 'open'
         ORDER BY created_at DESC`,
      );
      return rows.map(mapTask);
    },

    async update(id: string, patch: TaskUpdate): Promise<void> {
      const sets: string[] = [];
      const params: (string | number | null)[] = [];
      for (const [key, column] of Object.entries(UPDATE_COLUMNS) as [keyof TaskUpdate, string][]) {
        if (key in patch) {
          sets.push(`${column} = ?`);
          params.push(patch[key] ?? null);
        }
      }
      if (sets.length === 0) return;
      params.push(id);
      await db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    },

    async complete(id: string, completedAt: number): Promise<void> {
      await db.run(`UPDATE tasks SET status = 'done', completed_at = ? WHERE id = ?`, [
        completedAt,
        id,
      ]);
    },

    async uncomplete(id: string): Promise<void> {
      await db.run(`UPDATE tasks SET status = 'open', completed_at = NULL WHERE id = ?`, [id]);
    },

    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    },
  };
}

export { mapTask as mapTaskRow };
