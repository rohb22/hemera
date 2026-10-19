export type TaskStatus = 'open' | 'done';

export interface Task {
  id: string;
  title: string;
  notes: string;
  deadlineDate: string | null;
  deadlineTime: string | null;
  scheduledDate: string | null;
  startTime: string | null;
  durationMin: number | null;
  status: TaskStatus;
  createdAt: number;
  completedAt: number | null;
}

export interface NewTaskInput {
  title: string;
  notes?: string;
  deadlineDate?: string | null;
  deadlineTime?: string | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  durationMin?: number | null;
}

export type OccurrenceState = 'pending' | 'done' | 'skipped';

export interface Habit {
  id: string;
  name: string;
  daysMask: number;
  createdAt: number;
  archivedAt: number | null;
}

export interface HabitOccurrence {
  habitId: string;
  date: string;
  state: OccurrenceState;
  updatedAt: number;
}

export interface NewHabitInput {
  name: string;
  daysMask: number;
}
