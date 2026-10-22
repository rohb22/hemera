import { differenceInCalendarDays, parseISO } from 'date-fns';

import { todayKey } from './calendar';
import { taskPoolSection } from './taskLabels';
import type { Task } from './types';

/**
 * Reset My Day (v1.2, D21–D27).
 *
 * Pure domain logic for the review screen: which tasks were carried
 * over, how they are grouped, and what each choice does to a task's
 * schedule. No React, no database, no clock — everything that depends
 * on "now" is passed in.
 */

export type ResetAction = 'keep' | 'pool' | 'pick' | 'dismiss';

export interface ResetChoice {
  action: ResetAction;
  /** The picked clock time for the `pick` action (`HH:mm`). */
  time?: string | null;
}

/** The schedule fields a reset can move. */
export interface ResetSchedule {
  scheduledDate: string | null;
  startTime: string | null;
  durationMin: number | null;
}

export interface ResetCandidate {
  task: Task;
  /** Calendar days between the scheduled date and today. 1 = yesterday. */
  daysLate: number;
}

export interface ResetGroup {
  key: string;
  title: string;
  candidates: ResetCandidate[];
}

export interface ResetPlanEntry {
  taskId: string;
  action: ResetAction;
  from: ResetSchedule;
  to: ResetSchedule;
}

export const RESET_ACTIONS: ResetAction[] = ['keep', 'pool', 'pick', 'dismiss'];

/**
 * The lateness groups, most recent first (D27). `maxDays` is inclusive.
 * The 7-day window (D3) caps the range, so two groups cover it: a task
 * from yesterday and a task from longer ago.
 */
const GROUPS: { key: string; title: string; maxDays: number }[] = [
  { key: 'yesterday', title: 'Yesterday', maxDays: 1 },
  { key: 'earlier', title: 'Earlier', maxDays: 7 },
];

export function defaultChoice(): ResetChoice {
  return { action: 'keep' };
}

function scheduleOf(task: Task): ResetSchedule {
  return {
    scheduledDate: task.scheduledDate,
    startTime: task.startTime,
    durationMin: task.durationMin,
  };
}

export function sameSchedule(a: ResetSchedule, b: ResetSchedule): boolean {
  return (
    a.scheduledDate === b.scheduledDate &&
    a.startTime === b.startTime &&
    a.durationMin === b.durationMin
  );
}

/**
 * The tasks a review offers (D22): open, timed, scheduled on a day
 * before today, and inside D3's 7-day window. A task that is merely
 * late *today* is not carried over — it already has a one-tap action in
 * Today's "Needs rescheduling" section. The 7-day window comes from
 * `taskPoolSection`, so D3 stays the single source of truth.
 */
export function resetCandidates(tasks: Task[], now: Date): ResetCandidate[] {
  const today = todayKey(now);
  const candidates: ResetCandidate[] = [];

  for (const task of tasks) {
    if (task.status !== 'open') continue;
    if (!task.scheduledDate || !task.startTime) continue;
    if (task.scheduledDate >= today) continue;
    if (taskPoolSection(task, now) !== 'reschedule') continue;
    candidates.push({
      task,
      daysLate: differenceInCalendarDays(parseISO(today), parseISO(task.scheduledDate)),
    });
  }

  return candidates.sort((a, b) => {
    if (a.daysLate !== b.daysLate) return a.daysLate - b.daysLate;
    const at = a.task.startTime ?? '';
    const bt = b.task.startTime ?? '';
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
}

/**
 * Groups the candidates by how late they are (D27). Within a group the
 * rows keep the order `resetCandidates` gave them — the scheduled start
 * time, earliest first (A19).
 */
export function groupResetCandidates(candidates: ResetCandidate[]): ResetGroup[] {
  const groups: ResetGroup[] = GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    candidates: [],
  }));

  for (const candidate of candidates) {
    const index = GROUPS.findIndex((group) => candidate.daysLate <= group.maxDays);
    if (index < 0) continue;
    groups[index].candidates.push(candidate);
  }

  return groups.filter((group) => group.candidates.length > 0);
}

/**
 * Turns the candidates and the chosen actions into the writes the
 * repository applies. Every entry carries the schedule before and
 * after, so the history can restore it.
 */
export function planReset(
  candidates: ResetCandidate[],
  choices: Record<string, ResetChoice>,
  today: string,
): ResetPlanEntry[] {
  return candidates.map(({ task }) => {
    const choice = choices[task.id] ?? defaultChoice();
    const from = scheduleOf(task);

    switch (choice.action) {
      case 'pool':
        return {
          taskId: task.id,
          action: 'pool' as const,
          from,
          to: { scheduledDate: null, startTime: null, durationMin: null },
        };
      case 'pick':
        return {
          taskId: task.id,
          action: 'pick' as const,
          from,
          to: {
            scheduledDate: today,
            startTime: choice.time ?? task.startTime,
            durationMin: task.durationMin,
          },
        };
      case 'dismiss':
        return {
          taskId: task.id,
          action: 'dismiss' as const,
          from,
          to: { ...from },
        };
      case 'keep':
      default:
        return {
          taskId: task.id,
          action: 'keep' as const,
          from,
          to: {
            scheduledDate: today,
            startTime: task.startTime,
            durationMin: task.durationMin,
          },
        };
    }
  });
}

/** The entries that actually change something. */
export function changedEntries(entries: ResetPlanEntry[]): ResetPlanEntry[] {
  return entries.filter((entry) => !sameSchedule(entry.from, entry.to));
}
