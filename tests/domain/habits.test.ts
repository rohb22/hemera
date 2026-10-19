import {
  ALL_DAYS_MASK,
  dayIndexesFromMask,
  dayMaskIsValid,
  habitDayLabel,
  habitDayState,
  lastNWeekStarts,
  maskFromDayIndexes,
  plannedDayNames,
  plannedOn,
  progressCaption,
  weekDates,
  weekStartKey,
  weeklyProgress,
} from '@/domain/habits';
import type { OccurrenceState } from '@/domain/types';

describe('day mask helpers', () => {
  it('round-trips Mon-first indexes', () => {
    const mask = maskFromDayIndexes([0, 2, 4]);
    expect(mask).toBe(21);
    expect(dayIndexesFromMask(mask)).toEqual([0, 2, 4]);
    expect(dayIndexesFromMask(ALL_DAYS_MASK)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('validates the schema bounds (1..127)', () => {
    expect(dayMaskIsValid(1)).toBe(true);
    expect(dayMaskIsValid(127)).toBe(true);
    expect(dayMaskIsValid(0)).toBe(false);
    expect(dayMaskIsValid(128)).toBe(false);
    expect(dayMaskIsValid(1.5)).toBe(false);
  });

  it('plans on the masked weekdays (Mon/Wed/Fri = 21)', () => {
    expect(plannedOn(21, '2026-10-19')).toBe(true); // Monday
    expect(plannedOn(21, '2026-10-20')).toBe(false); // Tuesday
    expect(plannedOn(21, '2026-10-21')).toBe(true); // Wednesday
    expect(plannedOn(21, '2026-10-25')).toBe(false); // Sunday
    expect(plannedOn(ALL_DAYS_MASK, '2026-10-25')).toBe(true);
  });

  it('formats planned day names', () => {
    expect(plannedDayNames(21)).toBe('Monday, Wednesday, Friday');
    expect(plannedDayNames(ALL_DAYS_MASK)).toBe(
      'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
    );
  });
});

describe('week windows (A3 default Monday)', () => {
  it('starts the window on Monday', () => {
    expect(weekStartKey('2026-10-21')).toBe('2026-10-19'); // Wed → Mon
    expect(weekStartKey('2026-10-19')).toBe('2026-10-19'); // Mon → itself
    expect(weekStartKey('2026-10-25')).toBe('2026-10-19'); // Sun → same Mon
  });

  it('lists the seven dates and the last n weeks, newest first', () => {
    expect(weekDates('2026-10-19')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    expect(lastNWeekStarts('2026-10-21', 4)).toEqual([
      '2026-10-19',
      '2026-10-12',
      '2026-10-05',
      '2026-09-28',
    ]);
  });
});

function stateFor(input: {
  date: string;
  row?: OccurrenceState;
  mask?: number;
  created?: string;
  today?: string;
}) {
  return habitDayState({
    dateKey: input.date,
    rowState: input.row ?? null,
    daysMask: input.mask ?? 21,
    createdAtKey: input.created ?? '2026-09-01',
    todayKey: input.today ?? '2026-10-19',
  });
}

describe('habitDayState (H1/H2, ADR-0007)', () => {
  it('honours explicit done/skipped rows first', () => {
    expect(stateFor({ date: '2026-10-20', row: 'done' })).toBe('done');
    expect(stateFor({ date: '2026-10-19', row: 'skipped' })).toBe('skipped');
    expect(stateFor({ date: '2026-10-25', row: 'done' })).toBe('done'); // unplanned but done
  });

  it('derives missed only for past planned days after creation', () => {
    expect(stateFor({ date: '2026-10-16' })).toBe('missed'); // Friday, planned, past
    expect(stateFor({ date: '2026-10-13' })).toBe('unplanned'); // Tuesday, unplanned, past
    expect(stateFor({ date: '2026-10-19', row: 'pending' })).not.toBe('missed'); // today
  });

  it('keeps pre-creation days neutral, never missed', () => {
    expect(stateFor({ date: '2026-10-19', created: '2026-10-22' })).toBe('neutral');
    expect(stateFor({ date: '2026-10-19', created: '2026-10-22', mask: ALL_DAYS_MASK })).toBe(
      'neutral',
    );
  });

  it('reads today as not-yet when planned, inactive for the future', () => {
    expect(stateFor({ date: '2026-10-19' })).toBe('pending'); // Monday planned
    expect(stateFor({ date: '2026-10-19', mask: 2 })).toBe('unplanned'); // Monday unplanned
    expect(stateFor({ date: '2026-10-21' })).toBe('unplanned'); // future — inactive
    expect(stateFor({ date: '2026-10-21', mask: ALL_DAYS_MASK })).toBe('unplanned');
  });

  it('derives missed from a lingering pending row on a past planned day', () => {
    expect(stateFor({ date: '2026-10-16', row: 'pending' })).toBe('missed'); // Friday
    expect(stateFor({ date: '2026-10-13', row: 'pending' })).toBe('unplanned'); // Tuesday
  });
});

describe('habitDayLabel', () => {
  it('dual-encodes every state in words', () => {
    expect(habitDayLabel('done', true)).toBe('done');
    expect(habitDayLabel('skipped', true)).toBe('skipped');
    expect(habitDayLabel('missed', true)).toBe('missed');
    expect(habitDayLabel('pending', true)).toBe('not yet');
    expect(habitDayLabel('unplanned', true)).toBe('not yet'); // future/planned
    expect(habitDayLabel('unplanned', false)).toBe('not planned');
    expect(habitDayLabel('neutral', true)).toBe('not planned');
  });
});

describe('weeklyProgress (H3/D11)', () => {
  const created = '2026-09-01';
  const week = '2026-10-19';

  it('counts done vs planned days; skipped never counts; off-days count', () => {
    const progress = weeklyProgress(
      21, // Mon/Wed/Fri
      [
        { date: '2026-10-19', state: 'done' }, // Monday
        { date: '2026-10-20', state: 'done' }, // Tuesday — off-day, counts
        { date: '2026-10-21', state: 'skipped' }, // Wednesday — never counts
      ],
      week,
      created,
    );
    expect(progress).toEqual({ done: 2, planned: 3, met: false });
  });

  it('meets the target when done >= planned', () => {
    const progress = weeklyProgress(
      21,
      [
        { date: '2026-10-19', state: 'done' },
        { date: '2026-10-21', state: 'done' },
        { date: '2026-10-23', state: 'done' },
      ],
      week,
      created,
    );
    expect(progress.met).toBe(true);
    expect(progressCaption(progress)).toBe('3 of 3 this week');
  });

  it('excludes pre-creation days from the planned denominator', () => {
    const progress = weeklyProgress(ALL_DAYS_MASK, [], week, '2026-10-22'); // created Thu
    expect(progress.planned).toBe(4); // Thu–Sun only
    expect(progress.met).toBe(false);
  });

  it('never meets a zero-day target', () => {
    const progress = weeklyProgress(1, [], week, '2026-10-21'); // Mon pre-creation
    expect(progress).toEqual({ done: 0, planned: 0, met: false });
    expect(progressCaption(progress)).toBe('0 of 0 this week');
  });
});
