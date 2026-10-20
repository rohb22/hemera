import { formatDayHeading, toDateKey, toTimeKey, todayKey } from '@/domain/calendar';
import { addDaysKey, weekStartFor } from '@/domain/habits';

describe('day keys at the day boundary (midnight)', () => {
  it('flips the key exactly at local midnight', () => {
    expect(toDateKey(new Date(2026, 9, 19, 23, 59, 59, 999))).toBe('2026-10-19');
    expect(toDateKey(new Date(2026, 9, 20, 0, 0, 0, 0))).toBe('2026-10-20');
    expect(todayKey(new Date(2026, 9, 20, 0, 0, 0, 0))).toBe('2026-10-20');
  });

  it('formats time keys on both sides of midnight', () => {
    expect(toTimeKey(new Date(2026, 9, 19, 23, 59))).toBe('23:59');
    expect(toTimeKey(new Date(2026, 9, 20, 0, 0))).toBe('00:00');
  });

  it('formats the day heading', () => {
    expect(formatDayHeading(new Date(2026, 9, 20))).toBe('Tuesday, October 20');
  });
});

describe('local calendar days across DST transitions', () => {
  // Spring-forward dates: US 2026-03-08, EU 2026-03-29. The local wall clock
  // may skip an hour, but the calendar day must not shift.
  it('keeps the same day key around both spring-forward dates', () => {
    expect(toDateKey(new Date(2026, 2, 8, 0, 30))).toBe('2026-03-08');
    expect(toDateKey(new Date(2026, 2, 8, 23, 30))).toBe('2026-03-08');
    expect(toDateKey(new Date(2026, 2, 29, 0, 30))).toBe('2026-03-29');
    expect(toDateKey(new Date(2026, 2, 29, 23, 30))).toBe('2026-03-29');
  });

  it('keeps the same day key around fall-back dates', () => {
    expect(toDateKey(new Date(2026, 10, 1, 1, 30))).toBe('2026-11-01');
    expect(toDateKey(new Date(2026, 9, 25, 2, 30))).toBe('2026-10-25');
  });

  it('steps one calendar day across a DST transition', () => {
    expect(addDaysKey('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDaysKey('2026-03-28', 1)).toBe('2026-03-29');
  });

  it('derives week starts across DST (A3)', () => {
    expect(weekStartFor('2026-03-29', 1)).toBe('2026-03-23');
    expect(weekStartFor('2026-03-29', 0)).toBe('2026-03-29');
    expect(weekStartFor('2026-11-01', 1)).toBe('2026-10-26');
  });
});
