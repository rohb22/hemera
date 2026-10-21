import { format } from 'date-fns';

export const DATE_KEY_FORMAT = 'yyyy-MM-dd';
export const TIME_KEY_FORMAT = 'HH:mm';

export const toDateKey = (date: Date): string => format(date, DATE_KEY_FORMAT);
export const toTimeKey = (date: Date): string => format(date, TIME_KEY_FORMAT);

export const todayKey = (now: Date): string => toDateKey(now);

export const formatDayHeading = (date: Date): string => format(date, 'EEEE, MMMM d');

/** Local-time `yyyy-MM-dd` + `HH:mm` → Date (no UTC shifting). */
export const combineDateTimeKey = (dateKey: string, timeKey: string): Date =>
  new Date(`${dateKey}T${timeKey}:00`);
