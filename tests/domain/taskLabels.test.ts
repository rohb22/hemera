import {
  deadlineReached,
  effectiveDurationMin,
  groupPool,
  scheduledEnd,
  taskCaption,
  taskPoolSection,
  timeRangeLabel,
  timelineTasks,
} from '@/domain/taskLabels';
import type { Task } from '@/domain/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Write the thing',
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

const HOUR = 60 * 60 * 1000;

describe('schedule math', () => {
  it('defaults duration to 30 min when a start time exists (A2)', () => {
    expect(effectiveDurationMin(makeTask({ startTime: '09:00' }))).toBe(30);
    expect(effectiveDurationMin(makeTask({ startTime: '09:00', durationMin: 60 }))).toBe(60);
    expect(effectiveDurationMin(makeTask())).toBeNull();
  });

  it('computes the scheduled block end', () => {
    const end = scheduledEnd(makeTask({ scheduledDate: '2026-10-19', startTime: '14:00' }));
    expect(end).toEqual(new Date('2026-10-19T14:30:00'));
  });

  it('is null without a start time', () => {
    expect(scheduledEnd(makeTask({ scheduledDate: '2026-10-19' }))).toBeNull();
  });

  it('formats a time range label', () => {
    expect(
      timeRangeLabel(makeTask({ scheduledDate: '2026-10-19', startTime: '14:00', durationMin: 60 })),
    ).toBe('14:00–15:00');
    expect(timeRangeLabel(makeTask({ scheduledDate: '2026-10-19', startTime: '14:00' }))).toBe(
      '14:00–14:30',
    );
    expect(timeRangeLabel(makeTask())).toBeNull();
  });
});

describe('deadlineReached (D9)', () => {
  const now = new Date('2026-10-19T12:00:00');

  it('is false with no deadline', () => {
    expect(deadlineReached(makeTask(), now)).toBe(false);
  });

  it('all-day: reached when the deadline date is today or past', () => {
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-19' }), now)).toBe(true);
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-18' }), now)).toBe(true);
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-20' }), now)).toBe(false);
  });

  it('timed: reached only after the time passes', () => {
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-19', deadlineTime: '11:59' }), now)).toBe(true);
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-19', deadlineTime: '12:00' }), now)).toBe(true);
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-19', deadlineTime: '12:01' }), now)).toBe(false);
    expect(deadlineReached(makeTask({ deadlineDate: '2026-10-18', deadlineTime: '23:59' }), now)).toBe(true);
  });
});

describe('taskPoolSection (M1)', () => {
  const now = new Date('2026-10-19T12:00:00');

  it('done tasks never appear', () => {
    expect(taskPoolSection(makeTask({ status: 'done' }), now)).toBeNull();
  });

  it('unscheduled without a reached deadline goes to the pool', () => {
    expect(taskPoolSection(makeTask(), now)).toBe('pool');
    expect(taskPoolSection(makeTask({ deadlineDate: '2026-10-20' }), now)).toBe('pool');
  });

  it('unscheduled with a reached deadline goes to attention', () => {
    expect(taskPoolSection(makeTask({ deadlineDate: '2026-10-19' }), now)).toBe('attention');
    expect(taskPoolSection(makeTask({ deadlineDate: '2026-10-18' }), now)).toBe('attention');
    expect(
      taskPoolSection(makeTask({ deadlineDate: '2026-10-19', deadlineTime: '11:00' }), now),
    ).toBe('attention');
    expect(
      taskPoolSection(makeTask({ deadlineDate: '2026-10-19', deadlineTime: '13:00' }), now),
    ).toBe('pool');
  });

  it('a scheduled block that has not ended is on the timeline, not in the pool', () => {
    expect(
      taskPoolSection(makeTask({ scheduledDate: '2026-10-19', startTime: '14:00' }), now),
    ).toBeNull();
    expect(
      taskPoolSection(makeTask({ scheduledDate: '2026-10-19', startTime: '11:30', durationMin: 60 }), now),
    ).toBeNull();
  });

  it('a scheduled block that ended today needs rescheduling', () => {
    expect(
      taskPoolSection(makeTask({ scheduledDate: '2026-10-19', startTime: '09:00' }), now),
    ).toBe('reschedule');
  });

  it('a scheduled task with a deadline stays off the attention section (no duplication)', () => {
    expect(
      taskPoolSection(
        makeTask({ scheduledDate: '2026-10-19', startTime: '09:00', deadlineDate: '2026-10-19' }),
        now,
      ),
    ).toBe('reschedule');
  });

  it('moves to Later after 7 days past the scheduled end (D3)', () => {
    expect(
      taskPoolSection(makeTask({ scheduledDate: '2026-10-13', startTime: '09:00' }), now),
    ).toBe('reschedule');

    expect(
      taskPoolSection(
        makeTask({ scheduledDate: '2026-10-12', startTime: '11:59', durationMin: 1 }),
        now,
      ),
    ).toBe('reschedule');

    expect(
      taskPoolSection(
        makeTask({ scheduledDate: '2026-10-12', startTime: '11:58', durationMin: 1 }),
        now,
      ),
    ).toBe('later');
  });
});

describe('taskCaption', () => {
  const now = new Date('2026-10-19T12:00:00');

  it('was-scheduled caption for past-scheduled tasks', () => {
    const caption = taskCaption(
      makeTask({ scheduledDate: '2026-10-13', startTime: '09:00' }),
      now,
    );
    expect(caption).toBe('was scheduled Tue 09:00');
  });

  it('Due today vs neutral overdue caption', () => {
    expect(taskCaption(makeTask({ deadlineDate: '2026-10-19' }), now)).toBe('Due today');
    expect(taskCaption(makeTask({ deadlineDate: '2026-10-18' }), now)).toBe('Was due Sun');
  });

  it('future deadline caption for plain pool rows', () => {
    expect(taskCaption(makeTask({ deadlineDate: '2026-10-22' }), now)).toBe('Due Thu 22');
    expect(
      taskCaption(makeTask({ deadlineDate: '2026-10-22', deadlineTime: '15:00' }), now),
    ).toBe('Due Thu 22 15:00');
    expect(taskCaption(makeTask(), now)).toBeNull();
  });
});

describe('groupPool + A12 ordering', () => {
  const now = new Date('2026-10-19T12:00:00');

  it('sorts needs-rescheduling most recently scheduled first', () => {
    const older = makeTask({ id: 'a', scheduledDate: '2026-10-17', startTime: '09:00' });
    const newer = makeTask({ id: 'b', scheduledDate: '2026-10-18', startTime: '09:00' });
    const sections = groupPool([older, newer], now);
    expect(sections.reschedule.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('sorts attention by earliest deadline first', () => {
    const later = makeTask({ id: 'a', deadlineDate: '2026-10-18' });
    const sooner = makeTask({ id: 'b', deadlineDate: '2026-10-12' });
    const sections = groupPool([later, sooner], now);
    expect(sections.attention.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('sorts the plain pool newest created first', () => {
    const old = makeTask({ id: 'a', createdAt: 1 });
    const fresh = makeTask({ id: 'b', createdAt: 2 });
    const sections = groupPool([old, fresh], now);
    expect(sections.pool.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('partitions every open task exactly once', () => {
    const tasks = [
      makeTask({ id: 'plain' }),
      makeTask({ id: 'due', deadlineDate: '2026-10-19' }),
      makeTask({ id: 'broken', scheduledDate: '2026-10-18', startTime: '09:00' }),
      makeTask({ id: 'old', scheduledDate: '2026-10-01', startTime: '09:00' }),
      makeTask({ id: 'future', scheduledDate: '2026-10-19', startTime: '15:00' }),
      makeTask({ id: 'done', status: 'done' }),
    ];
    const sections = groupPool(tasks, now);
    expect(sections.reschedule.map((t) => t.id)).toEqual(['broken']);
    expect(sections.attention.map((t) => t.id)).toEqual(['due']);
    expect(sections.pool.map((t) => t.id)).toEqual(['plain']);
    expect(sections.later.map((t) => t.id)).toEqual(['old']);
    expect(timelineTasks(tasks, '2026-10-19').map((t) => t.id)).toEqual(['future']);
  });
});

describe('timelineTasks', () => {
  it('filters to the viewed day, open, with a start time; chronological', () => {
    const tasks = [
      makeTask({ id: 'late', scheduledDate: '2026-10-19', startTime: '16:00' }),
      makeTask({ id: 'early', scheduledDate: '2026-10-19', startTime: '09:00' }),
      makeTask({ id: 'otherday', scheduledDate: '2026-10-20', startTime: '09:00' }),
      makeTask({ id: 'nodate-only', scheduledDate: '2026-10-19' }),
      makeTask({ id: 'done', scheduledDate: '2026-10-19', startTime: '10:00', status: 'done' }),
    ];
    expect(timelineTasks(tasks, '2026-10-19').map((t) => t.id)).toEqual(['early', 'late']);
  });
});
