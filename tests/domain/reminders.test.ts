import type { Habit, HabitOccurrence, Task } from '@/domain/types';
import {
  HABIT_NUDGE_ID,
  habitNudgeBody,
  habitNudgeDate,
  nextHabitNudgeDate,
  parseReminderTime,
  reminderDiff,
  taskReminderDate,
  taskReminderId,
  wantedReminders,
} from '@/domain/reminders';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Call the bank',
    notes: '',
    deadlineDate: null,
    deadlineTime: null,
    scheduledDate: null,
    startTime: null,
    durationMin: null,
    status: 'open',
    createdAt: 0,
    completedAt: null,
    ...overrides,
  };
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return { id: 'h1', name: 'Water', daysMask: 127, createdAt: 0, archivedAt: null, ...overrides };
}

function occurrence(habitId: string, date: string, state: HabitOccurrence['state']): HabitOccurrence {
  return { habitId, date, state, updatedAt: 0 };
}

const NOW = new Date('2026-10-21T09:00:00');

describe('parseReminderTime', () => {
  it('parses valid 24h times', () => {
    expect(parseReminderTime('20:00')).toBe(1200);
    expect(parseReminderTime('00:05')).toBe(5);
    expect(parseReminderTime('23:59')).toBe(1439);
  });

  it('rejects malformed times', () => {
    expect(parseReminderTime('24:00')).toBeNull();
    expect(parseReminderTime('8:00')).toBeNull();
    expect(parseReminderTime('')).toBeNull();
    expect(parseReminderTime('20:60')).toBeNull();
  });
});

describe('taskReminderDate (FR-R2)', () => {
  it('fires at the task start time on its scheduled date', () => {
    const task = makeTask({ scheduledDate: '2026-10-21', startTime: '14:30' });
    expect(taskReminderDate(task, NOW)?.getHours()).toBe(14);
    expect(taskReminderDate(task, NOW)?.getMinutes()).toBe(30);
    expect(taskReminderDate(task, NOW)?.getDate()).toBe(21);
  });

  it('never schedules a past moment (AC3)', () => {
    const task = makeTask({ scheduledDate: '2026-10-21', startTime: '08:59' });
    expect(taskReminderDate(task, NOW)).toBeNull();
    const yesterday = makeTask({ scheduledDate: '2026-10-20', startTime: '10:00' });
    expect(taskReminderDate(yesterday, NOW)).toBeNull();
  });

  it('ignores unscheduled, completed and untimed tasks', () => {
    expect(taskReminderDate(makeTask({ startTime: '14:00' }), NOW)).toBeNull();
    expect(taskReminderDate(makeTask({ scheduledDate: '2026-10-21' }), NOW)).toBeNull();
    expect(
      taskReminderDate(
        makeTask({ scheduledDate: '2026-10-21', startTime: '14:00', status: 'done' }),
        NOW,
      ),
    ).toBeNull();
  });
});

describe('habit nudge timing (FR-R3)', () => {
  it('fires at the chosen time later today', () => {
    const date = habitNudgeDate('20:00', NOW);
    expect(date?.getHours()).toBe(20);
    expect(date?.getDate()).toBe(21);
  });

  it('has no slot today once the time has passed', () => {
    expect(habitNudgeDate('08:00', NOW)).toBeNull();
  });

  it('re-arms for tomorrow when today has gone', () => {
    const date = nextHabitNudgeDate('08:00', NOW);
    expect(date?.getDate()).toBe(22);
    expect(date?.getHours()).toBe(8);
  });
});

describe('habitNudgeBody (FR-R3)', () => {
  const dateKey = '2026-10-21';

  it('names only the habits still outstanding', () => {
    const habits = [makeHabit({ id: 'h1', name: 'Water' }), makeHabit({ id: 'h2', name: 'Stretch' })];
    const occurrences = [occurrence('h1', dateKey, 'done')];
    expect(habitNudgeBody(habits, occurrences, dateKey)).toBe('Stretch');
  });

  it('stays silent when everything is done or skipped', () => {
    const habits = [makeHabit({ id: 'h1', name: 'Water' }), makeHabit({ id: 'h2', name: 'Stretch' })];
    const occurrences = [occurrence('h1', dateKey, 'done'), occurrence('h2', dateKey, 'skipped')];
    expect(habitNudgeBody(habits, occurrences, dateKey)).toBeNull();
  });

  it('never mentions archived habits and uses no counts or guilt language', () => {
    const habits = [
      makeHabit({ id: 'h1', name: 'Water' }),
      makeHabit({ id: 'h2', name: 'Old habit', archivedAt: 1 }),
    ];
    const body = habitNudgeBody(habits, [], dateKey);
    expect(body).toBe('Water');
    expect(body).not.toMatch(/\d|missed|streak|day/i);
  });
});

describe('wantedReminders + reminderDiff (D13)', () => {
  const base = {
    tasks: [makeTask({ scheduledDate: '2026-10-21', startTime: '14:00' })],
    habits: [makeHabit({ id: 'h1', name: 'Water' })],
    occurrences: [] as HabitOccurrence[],
    habitTime: '20:00',
    now: NOW,
  };

  it('wants nothing while the switches are off or permission is not granted', () => {
    const off = wantedReminders({
      ...base,
      taskRemindersEnabled: false,
      habitRemindersEnabled: false,
      permission: 'granted',
    });
    expect(off.tasks).toHaveLength(0);
    expect(off.habit).toBeNull();

    const denied = wantedReminders({
      ...base,
      taskRemindersEnabled: true,
      habitRemindersEnabled: true,
      permission: 'denied',
    });
    expect(denied.tasks).toHaveLength(0);
    expect(denied.habit).toBeNull();
  });

  it('wants both kinds when enabled and granted', () => {
    const wanted = wantedReminders({
      ...base,
      taskRemindersEnabled: true,
      habitRemindersEnabled: true,
      permission: 'granted',
    });
    expect(wanted.tasks.map((t) => t.id)).toEqual([taskReminderId('t1')]);
    expect(wanted.habit?.id).toBe(HABIT_NUDGE_ID);
    expect(wanted.habit?.title).toBe('Habits today');
    expect(wanted.habit?.body).toBe('Water');
  });

  it('cancels installed triggers that are no longer wanted', () => {
    const wanted = wantedReminders({
      ...base,
      taskRemindersEnabled: true,
      habitRemindersEnabled: false,
      permission: 'granted',
    });
    const diff = reminderDiff([taskReminderId('t1'), HABIT_NUDGE_ID, 'orphan'], wanted);
    expect(diff.cancel.sort()).toEqual([HABIT_NUDGE_ID, 'orphan'].sort());
    expect(diff.schedule).toHaveLength(1);
  });

  it('cancels everything when the user turns reminders off', () => {
    const wanted = wantedReminders({
      ...base,
      taskRemindersEnabled: false,
      habitRemindersEnabled: false,
      permission: 'granted',
    });
    const diff = reminderDiff([taskReminderId('t1'), HABIT_NUDGE_ID], wanted);
    expect(diff.cancel).toHaveLength(2);
    expect(diff.schedule).toHaveLength(0);
  });
});
