import { taskPoolSection } from '@/domain/taskLabels';
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

describe('taskPoolSection (M0 subset)', () => {
  const now = new Date('2026-10-19T12:00:00');

  it('returns "pool" for an open unscheduled task', () => {
    expect(taskPoolSection(makeTask(), '2026-10-19', now)).toBe('pool');
  });

  it('returns null for a done task', () => {
    expect(taskPoolSection(makeTask({ status: 'done' }), '2026-10-19', now)).toBeNull();
  });
});
