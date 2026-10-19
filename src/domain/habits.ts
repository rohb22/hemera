import { addDays, getISODay, parseISO, startOfWeek } from 'date-fns';

import { toDateKey } from '@/domain/calendar';
import type { HabitOccurrence, OccurrenceState } from '@/domain/types';

export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export const ALL_DAYS_MASK = 127;

/** Week-start day for display windows (A3/FR-S1): 1 = Monday (default), 0 = Sunday. */
export type WeekStartsOn = 0 | 1;

/** Mon-first day indexes: 0 = Monday … 6 = Sunday (bits of habits.days_mask). */
export function maskFromDayIndexes(indexes: number[]): number {
  let mask = 0;
  for (const index of indexes) mask |= 1 << index;
  return mask;
}

export function dayIndexesFromMask(mask: number): number[] {
  const indexes: number[] = [];
  for (let bit = 0; bit < 7; bit++) if (mask & (1 << bit)) indexes.push(bit);
  return indexes;
}

export function dayMaskIsValid(mask: number): boolean {
  return Number.isInteger(mask) && mask >= 1 && mask <= 127;
}

export function dayIndexOfWeek(dateKey: string): number {
  return getISODay(parseISO(dateKey)) - 1;
}

export function plannedOn(daysMask: number, dateKey: string): boolean {
  return (daysMask & (1 << dayIndexOfWeek(dateKey))) !== 0;
}

export function addDaysKey(dateKey: string, days: number): string {
  return toDateKey(addDays(parseISO(dateKey), days));
}

/** Evaluation window start (A3/FR-S1: setting-driven, default Monday). */
export function weekStartFor(dateKey: string, weekStartsOn: WeekStartsOn = 1): string {
  return toDateKey(startOfWeek(parseISO(dateKey), { weekStartsOn }));
}

export function weekDates(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysKey(startKey, index));
}

/** Week-start keys for the last n weeks, newest first. */
export function lastNWeekStarts(
  dateKey: string,
  n: number,
  weekStartsOn: WeekStartsOn = 1,
): string[] {
  const current = weekStartFor(dateKey, weekStartsOn);
  return Array.from({ length: n }, (_, index) => addDaysKey(current, -7 * index));
}

export function plannedDayNames(daysMask: number): string {
  return dayIndexesFromMask(daysMask)
    .map((index) => DAY_NAMES[index])
    .join(', ');
}

export type HabitDayState = 'done' | 'skipped' | 'missed' | 'pending' | 'neutral' | 'unplanned';

export interface HabitDayStateInput {
  dateKey: string;
  rowState: OccurrenceState | null;
  daysMask: number;
  createdAtKey: string;
  todayKey: string;
}

/**
 * Derived cell state (H1/H2, ADR-0007): explicit done/skipped rows win;
 * a pending row and a missing row both derive. Missed applies only to
 * past planned days after creation; pre-creation and unplanned days stay
 * neutral; today (planned) reads as not-yet; future days are inactive.
 */
export function habitDayState(input: HabitDayStateInput): HabitDayState {
  const { dateKey, rowState, daysMask, createdAtKey, todayKey } = input;
  if (rowState === 'done') return 'done';
  if (rowState === 'skipped') return 'skipped';
  if (dateKey < createdAtKey) return 'neutral';
  const planned = plannedOn(daysMask, dateKey);
  if (dateKey > todayKey) return 'unplanned';
  if (dateKey === todayKey) return planned ? 'pending' : 'unplanned';
  return planned ? 'missed' : 'unplanned';
}

export function habitDayLabel(state: HabitDayState, planned: boolean): string {
  switch (state) {
    case 'done':
      return 'done';
    case 'skipped':
      return 'skipped';
    case 'missed':
      return 'missed';
    case 'pending':
      return 'not yet';
    case 'neutral':
      return 'not planned';
    case 'unplanned':
      return planned ? 'not yet' : 'not planned';
  }
}

export interface WeekProgress {
  done: number;
  planned: number;
  met: boolean;
}

/**
 * H3/D11: done-count in the window vs planned days in the window.
 * Days before creation are excluded from both (H1). Skipped never
 * counts; off-day completions do; no percentage anywhere (H4).
 */
export function weeklyProgress(
  daysMask: number,
  occurrences: Pick<HabitOccurrence, 'date' | 'state'>[],
  weekStart: string,
  createdAtKey: string,
): WeekProgress {
  const dates = weekDates(weekStart);
  const windowEnd = dates[6];

  let planned = 0;
  for (const dateKey of dates) {
    if (dateKey < createdAtKey) continue;
    if (plannedOn(daysMask, dateKey)) planned++;
  }

  let done = 0;
  for (const occurrence of occurrences) {
    if (occurrence.state !== 'done') continue;
    if (occurrence.date < weekStart || occurrence.date > windowEnd) continue;
    done++;
  }

  return { done, planned, met: planned > 0 && done >= planned };
}

export function progressCaption(progress: WeekProgress): string {
  return `${progress.done} of ${progress.planned} this week`;
}
