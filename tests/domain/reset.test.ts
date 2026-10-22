import {
  changedEntries,
  defaultChoice,
  groupResetCandidates,
  planReset,
  resetCandidates,
} from '@/domain/reset';
import type { Task } from '@/domain/types';

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
