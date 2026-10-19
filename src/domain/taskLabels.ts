import { addMinutes, differenceInMilliseconds, format, parseISO } from 'date-fns';

import { todayKey } from './calendar';
import type { Task } from './types';

export type PoolSection = 'reschedule' | 'attention' | 'pool' | 'later';

export const DEFAULT_DURATION_MIN = 30;
export const LATER_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function effectiveDurationMin(task: Task): number | null {
  if (task.startTime) return task.durationMin ?? DEFAULT_DURATION_MIN;
  return task.durationMin;
}

export function scheduledStart(task: Task): Date | null {
  if (!task.scheduledDate || !task.startTime) return null;
  return parseISO(`${task.scheduledDate}T${task.startTime}`);
}

export function scheduledEnd(task: Task): Date | null {
  const start = scheduledStart(task);
  if (!start) return null;
  return addMinutes(start, effectiveDurationMin(task) ?? DEFAULT_DURATION_MIN);
}

export function deadlineReached(task: Task, now: Date): boolean {
  if (!task.deadlineDate) return false;
  if (!task.deadlineTime) {
    return task.deadlineDate <= todayKey(now);
  }
  return parseISO(`${task.deadlineDate}T${task.deadlineTime}`).getTime() <= now.getTime();
}

export function taskPoolSection(task: Task, now: Date): PoolSection | null {
  if (task.status === 'done') return null;
  const end = scheduledEnd(task);
  if (end) {
    const age = differenceInMilliseconds(now, end);
    if (age <= 0) return null;
    return age > LATER_AFTER_MS ? 'later' : 'reschedule';
  }
  if (task.deadlineDate && deadlineReached(task, now)) return 'attention';
  return 'pool';
}

export function taskCaption(task: Task, now: Date): string | null {
  const section = taskPoolSection(task, now);
  if (section === 'reschedule' || section === 'later') {
    const start = scheduledStart(task);
    if (!start) return null;
    return `was scheduled ${format(start, 'EEE HH:mm')}`;
  }
  if (section === 'attention') {
    return task.deadlineDate === todayKey(now)
      ? 'Due today'
      : `Was due ${format(parseISO(task.deadlineDate!), 'EEE')}`;
  }
  if (task.deadlineDate) {
    const time = task.deadlineTime ? ` ${task.deadlineTime}` : '';
    return `Due ${format(parseISO(task.deadlineDate), 'EEE d')}${time}`;
  }
  return null;
}

export function timeRangeLabel(task: Task): string | null {
  if (!task.startTime) return null;
  const end = scheduledEnd(task);
  if (!end) return task.startTime;
  return `${task.startTime}–${format(end, 'HH:mm')}`;
}

const deadlineSortValue = (task: Task): number => {
  if (!task.deadlineDate) return Number.MAX_SAFE_INTEGER;
  const time = task.deadlineTime ?? '23:59';
  return parseISO(`${task.deadlineDate}T${time}`).getTime();
};

const scheduledSortValue = (task: Task): number => {
  const end = scheduledEnd(task);
  return end ? end.getTime() : 0;
};

const sectionOrder: Record<PoolSection, (a: Task, b: Task) => number> = {
  reschedule: (a, b) => scheduledSortValue(b) - scheduledSortValue(a),
  attention: (a, b) => deadlineSortValue(a) - deadlineSortValue(b),
  pool: (a, b) => b.createdAt - a.createdAt,
  later: (a, b) => scheduledSortValue(b) - scheduledSortValue(a),
};

export function sortForSection(section: PoolSection, tasks: Task[]): Task[] {
  return [...tasks].sort(sectionOrder[section]);
}

export interface PoolSections {
  reschedule: Task[];
  attention: Task[];
  pool: Task[];
  later: Task[];
}

export function groupPool(tasks: Task[], now: Date): PoolSections {
  const sections: PoolSections = { reschedule: [], attention: [], pool: [], later: [] };
  for (const task of tasks) {
    const section = taskPoolSection(task, now);
    if (section) sections[section].push(task);
  }
  return {
    reschedule: sortForSection('reschedule', sections.reschedule),
    attention: sortForSection('attention', sections.attention),
    pool: sortForSection('pool', sections.pool),
    later: sortForSection('later', sections.later),
  };
}

export function timelineTasks(tasks: Task[], dateKey: string): Task[] {
  return tasks
    .filter((task) => task.status === 'open' && task.scheduledDate === dateKey && task.startTime)
    .sort((a, b) => (a.startTime! < b.startTime! ? -1 : a.startTime! > b.startTime! ? 1 : 0));
}
