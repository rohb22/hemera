import type { Task } from '@/domain/types';
import type { TaskUpdate } from '@/repositories/tasks';

export const DURATION_CHIPS = [15, 30, 60, 90];

export interface TaskDraft {
  title: string;
  notes: string;
  schedDate: string | null;
  schedTime: string | null;
  durationMin: number;
  customDuration: string;
  deadlineDate: string | null;
  deadlineTime: string | null;
}

export interface TaskDraftErrors {
  title?: string;
  schedule?: string;
  deadline?: string;
  duration?: string;
}

export function emptyDraft(): TaskDraft {
  return {
    title: '',
    notes: '',
    schedDate: null,
    schedTime: null,
    durationMin: 30,
    customDuration: '',
    deadlineDate: null,
    deadlineTime: null,
  };
}

export function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    notes: task.notes,
    schedDate: task.scheduledDate,
    schedTime: task.startTime,
    durationMin:
      task.durationMin && DURATION_CHIPS.includes(task.durationMin) ? task.durationMin : 30,
    customDuration:
      task.durationMin && !DURATION_CHIPS.includes(task.durationMin)
        ? String(task.durationMin)
        : '',
    deadlineDate: task.deadlineDate,
    deadlineTime: task.deadlineTime,
  };
}

export function validateTaskDraft(draft: TaskDraft): TaskDraftErrors {
  const errors: TaskDraftErrors = {};
  if (!draft.title.trim()) errors.title = 'Add a title.';
  if (draft.schedDate && !draft.schedTime) {
    errors.schedule = 'Add a start time to schedule this task.';
  }
  if (draft.deadlineTime && !draft.deadlineDate) {
    errors.deadline = 'Add a due date first.';
  }
  if (draft.schedDate && draft.schedTime && draft.customDuration.trim()) {
    const parsed = Number(draft.customDuration);
    if (!Number.isInteger(parsed) || parsed < 5 || parsed > 1440) {
      errors.duration = 'Use 5–1440 minutes.';
    }
  }
  return errors;
}

export function taskDraftPayload(draft: TaskDraft): TaskUpdate & { title: string } {
  let durationMin: number | null = null;
  if (draft.schedDate && draft.schedTime) {
    durationMin = draft.customDuration.trim() ? Number(draft.customDuration) : draft.durationMin;
  }
  return {
    title: draft.title.trim(),
    notes: draft.notes,
    scheduledDate: draft.schedDate,
    startTime: draft.schedDate ? draft.schedTime : null,
    durationMin,
    deadlineDate: draft.deadlineDate,
    deadlineTime: draft.deadlineDate ? draft.deadlineTime : null,
  };
}
