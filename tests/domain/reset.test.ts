import {
  changedEntries,
  defaultChoice,
  groupResetCandidates,
  planReset,
  resetCandidates,
  resetCaption,
} from '@/domain/reset';
import type { Task } from '@/domain/types';
import { groupPool, timelineTasks } from '@/domain/taskLabels';

/**
 * Reset My Day (v1.2). The candidate rule is the load-bearing part:
 * it decides what a review offers, so it is pinned down here.
 */

const NOW = new Date('2026-10-22T12:00:00');

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write the report',
    notes: '',
    deadlineDate: null,
    deadlineTime: null,
    scheduledDate: '2026-10-21',
    startTime: '09:00',
    durationMin: 30,
    status: 'open',
    createdAt: 0,
    completedAt: null,
    ...overrides,
  };
}

describe('resetCandidates', () => {
  it('offers a task scheduled on an earlier day', () => {
    const candidates = resetCandidates([task()], NOW);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].task.id).toBe('task-1');
    expect(candidates[0].daysLate).toBe(1);
  });

  it('does not offer a task that is merely late today', () => {
    const candidates = resetCandidates(
      [task({ scheduledDate: '2026-10-22', startTime: '09:00' })],
      NOW,
    );

    expect(candidates).toHaveLength(0);
  });

  it('does not offer a task scheduled in the future', () => {
    const candidates = resetCandidates(
      [task({ scheduledDate: '2026-10-23', startTime: '09:00' })],
      NOW,
    );

    expect(candidates).toHaveLength(0);
  });

  it('does not offer a task older than the 7-day window (D3)', () => {
    const candidates = resetCandidates(
      [task({ scheduledDate: '2026-10-10', startTime: '09:00' })],
      NOW,
    );

    expect(candidates).toHaveLength(0);
  });

  it('still offers a task exactly at the 7-day edge of the window', () => {
    // Scheduled seven days ago and ending exactly now: the age is the
    // window, not past it.
    const candidates = resetCandidates(
      [task({ scheduledDate: '2026-10-15', startTime: '11:30', durationMin: 30 })],
      NOW,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].daysLate).toBe(7);
  });

  it('does not offer a completed task', () => {
    const candidates = resetCandidates(
      [task({ status: 'done', completedAt: 1 })],
      NOW,
    );

    expect(candidates).toHaveLength(0);
  });

  it('does not offer a task without a start time', () => {
    const candidates = resetCandidates([task({ startTime: null, durationMin: null })], NOW);

    expect(candidates).toHaveLength(0);
  });

  it('does not offer an unscheduled task', () => {
    const candidates = resetCandidates(
      [task({ scheduledDate: null, startTime: null, durationMin: null })],
      NOW,
    );

    expect(candidates).toHaveLength(0);
  });

  it('orders candidates by lateness, then by scheduled start time', () => {
    const candidates = resetCandidates(
      [
        task({ id: 'older', scheduledDate: '2026-10-18', startTime: '08:00' }),
        task({ id: 'yesterday-late', scheduledDate: '2026-10-21', startTime: '15:00' }),
        task({ id: 'yesterday-early', scheduledDate: '2026-10-21', startTime: '08:00' }),
      ],
      NOW,
    );

    expect(candidates.map((c) => c.task.id)).toEqual([
      'yesterday-early',
      'yesterday-late',
      'older',
    ]);
  });
});

describe('resetCaption', () => {
  it('states the exact date and time (D27)', () => {
    expect(resetCaption(task({ scheduledDate: '2026-10-21', startTime: '09:00' }))).toBe(
      'was scheduled Wed 21 Oct, 09:00',
    );
  });

  it('does not leave an "Earlier" row ambiguous', () => {
    // A weekday alone would read the same for two tasks a week apart.
    const caption = resetCaption(task({ scheduledDate: '2026-10-19', startTime: '09:00' }));

    expect(caption).toBe('was scheduled Mon 19 Oct, 09:00');
    expect(caption).toContain('19 Oct');
  });

  it('says nothing for a task that is not scheduled', () => {
    expect(resetCaption(task({ scheduledDate: null, startTime: null }))).toBeNull();
  });
});

describe('groupResetCandidates', () => {
  it('splits the candidates into Yesterday and Earlier', () => {
    const groups = groupResetCandidates(
      resetCandidates(
        [
          task({ id: 'a', scheduledDate: '2026-10-21', startTime: '09:00' }),
          task({ id: 'b', scheduledDate: '2026-10-19', startTime: '09:00' }),
        ],
        NOW,
      ),
    );

    expect(groups.map((g) => g.title)).toEqual(['Yesterday', 'Earlier']);
    expect(groups[0].candidates.map((c) => c.task.id)).toEqual(['a']);
    expect(groups[1].candidates.map((c) => c.task.id)).toEqual(['b']);
  });

  it('drops empty groups', () => {
    const groups = groupResetCandidates(
      resetCandidates([task({ scheduledDate: '2026-10-19', startTime: '09:00' })], NOW),
    );

    expect(groups.map((g) => g.title)).toEqual(['Earlier']);
  });

  it('returns nothing when nothing was carried over', () => {
    expect(groupResetCandidates([])).toEqual([]);
  });
});

describe('planReset', () => {
  const candidates = resetCandidates(
    [task({ id: 'a', scheduledDate: '2026-10-21', startTime: '09:00', durationMin: 45 })],
    NOW,
  );

  it('keeps the clock time and moves the task to today by default', () => {
    const [entry] = planReset(candidates, {}, '2026-10-22');

    expect(entry.action).toBe('keep');
    expect(entry.to).toEqual({
      scheduledDate: '2026-10-22',
      startTime: '09:00',
      durationMin: 45,
    });
    expect(entry.from).toEqual({
      scheduledDate: '2026-10-21',
      startTime: '09:00',
      durationMin: 45,
    });
  });

  it('defaults to keep when the task has no explicit choice', () => {
    expect(defaultChoice()).toEqual({ action: 'keep' });
  });

  it('keeps a clock time that has already passed today (D24)', () => {
    const [entry] = planReset(candidates, { a: { action: 'keep' } }, '2026-10-22');

    expect(entry.to.startTime).toBe('09:00');
    expect(entry.to.scheduledDate).toBe('2026-10-22');
  });

  it('clears the whole schedule when moved to the pool', () => {
    const [entry] = planReset(candidates, { a: { action: 'pool' } }, '2026-10-22');

    expect(entry.action).toBe('pool');
    expect(entry.to).toEqual({
      scheduledDate: null,
      startTime: null,
      durationMin: null,
    });
  });

  it('schedules the picked time for today', () => {
    const [entry] = planReset(
      candidates,
      { a: { action: 'pick', time: '14:30' } },
      '2026-10-22',
    );

    expect(entry.action).toBe('pick');
    expect(entry.to).toEqual({
      scheduledDate: '2026-10-22',
      startTime: '14:30',
      durationMin: 45,
    });
  });

  it('falls back to the original time when a pick has no time', () => {
    const [entry] = planReset(candidates, { a: { action: 'pick' } }, '2026-10-22');

    expect(entry.to.startTime).toBe('09:00');
  });

  it('leaves the task untouched when dismissed', () => {
    const [entry] = planReset(candidates, { a: { action: 'dismiss' } }, '2026-10-22');

    expect(entry.action).toBe('dismiss');
    expect(entry.to).toEqual(entry.from);
    expect(changedEntries([entry])).toHaveLength(0);
  });

  it('counts only the entries that change something', () => {
    const many = resetCandidates(
      [
        task({ id: 'a', scheduledDate: '2026-10-21', startTime: '09:00' }),
        task({ id: 'b', scheduledDate: '2026-10-21', startTime: '10:00' }),
      ],
      NOW,
    );

    const entries = planReset(
      many,
      { a: { action: 'keep' }, b: { action: 'dismiss' } },
      '2026-10-22',
    );

    expect(changedEntries(entries).map((e) => e.taskId)).toEqual(['a']);
  });
});

/**
 * The review and Today's pool must agree. The quiet line counts what
 * "Needs rescheduling" holds, so the number on the line has to be the
 * number of rows the review will open with (D21, D22).
 *
 * This is the split the device pass made concrete: a task that is
 * merely late *today* lives on today's timeline, behind the now-dot,
 * so it never reaches the pool — and it is not carried over either.
 */
describe('the review and the pool agree', () => {
  const TODAY = '2026-10-22';

  const carried = task({ id: 'carried', scheduledDate: '2026-10-21', startTime: '09:00' });
  const lateToday = task({ id: 'late-today', scheduledDate: TODAY, startTime: '09:00' });
  const future = task({ id: 'future', scheduledDate: '2026-10-24', startTime: '09:00' });
  const unscheduled = task({
    id: 'unscheduled',
    scheduledDate: null,
    startTime: null,
    durationMin: null,
  });
  const old = task({ id: 'old', scheduledDate: '2026-10-01', startTime: '09:00' });

  const tasks = [carried, lateToday, future, unscheduled, old];

  function todaysPool() {
    const onTimeline = new Set(timelineTasks(tasks, TODAY).map((t) => t.id));
    return groupPool(
      tasks.filter((t) => !onTimeline.has(t.id)),
      NOW,
    );
  }

  it('offers exactly the tasks under "Needs rescheduling"', () => {
    const candidates = resetCandidates(tasks, NOW).map((c) => c.task.id);
    const reschedule = todaysPool().reschedule.map((t) => t.id);

    expect([...reschedule].sort()).toEqual([...candidates].sort());
    expect(candidates).toEqual(['carried']);
  });

  it('keeps a task that is merely late today on the timeline, not in the pool', () => {
    expect(timelineTasks(tasks, TODAY).map((t) => t.id)).toEqual(['late-today']);
    expect(todaysPool().reschedule.map((t) => t.id)).not.toContain('late-today');
    expect(resetCandidates(tasks, NOW).map((c) => c.task.id)).not.toContain('late-today');
  });

  it('leaves a task older than the 7-day window in "Later"', () => {
    expect(todaysPool().later.map((t) => t.id)).toEqual(['old']);
  });

  it('leaves an unscheduled task in the plain pool', () => {
    expect(todaysPool().pool.map((t) => t.id)).toEqual(['unscheduled']);
  });
});
