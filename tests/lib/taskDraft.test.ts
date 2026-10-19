import {
  draftFromTask,
  emptyDraft,
  taskDraftPayload,
  validateTaskDraft,
} from '@/lib/taskDraft';
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

describe('validateTaskDraft', () => {
  it('requires a title', () => {
    const errors = validateTaskDraft(emptyDraft());
    expect(errors.title).toBe('Add a title.');
  });

  it('rejects a scheduled date without a start time', () => {
    const errors = validateTaskDraft({ ...emptyDraft(), title: 'X', schedDate: '2026-10-21' });
    expect(errors.schedule).toBe('Add a start time to schedule this task.');
  });

  it('rejects a deadline time without a due date', () => {
    const errors = validateTaskDraft({ ...emptyDraft(), title: 'X', deadlineTime: '17:00' });
    expect(errors.deadline).toBe('Add a due date first.');
  });

  it('bounds custom duration to 5–1440', () => {
    const tooSmall = validateTaskDraft({
      ...emptyDraft(),
      title: 'X',
      schedDate: '2026-10-21',
      schedTime: '09:00',
      customDuration: '4',
    });
    expect(tooSmall.duration).toBe('Use 5–1440 minutes.');

    const tooBig = validateTaskDraft({
      ...emptyDraft(),
      title: 'X',
      schedDate: '2026-10-21',
      schedTime: '09:00',
      customDuration: '2000',
    });
    expect(tooBig.duration).toBe('Use 5–1440 minutes.');

    const valid = validateTaskDraft({
      ...emptyDraft(),
      title: 'X',
      schedDate: '2026-10-21',
      schedTime: '09:00',
      customDuration: '45',
    });
    expect(valid).toEqual({});
  });
});

describe('taskDraftPayload', () => {
  it('nulls schedule fields when the task is unscheduled', () => {
    const payload = taskDraftPayload({ ...emptyDraft(), title: '  Call  ' });
    expect(payload).toMatchObject({
      title: 'Call',
      scheduledDate: null,
      startTime: null,
      durationMin: null,
      deadlineDate: null,
      deadlineTime: null,
    });
  });

  it('uses the chip duration when no custom value is set', () => {
    const payload = taskDraftPayload({
      ...emptyDraft(),
      title: 'X',
      schedDate: '2026-10-21',
      schedTime: '09:30',
      durationMin: 60,
    });
    expect(payload.startTime).toBe('09:30');
    expect(payload.durationMin).toBe(60);
  });

  it('prefers a valid custom duration over the chip', () => {
    const payload = taskDraftPayload({
      ...emptyDraft(),
      title: 'X',
      schedDate: '2026-10-21',
      schedTime: '09:00',
      durationMin: 30,
      customDuration: '45',
    });
    expect(payload.durationMin).toBe(45);
  });

  it('nulls the deadline time when there is no due date', () => {
    const payload = taskDraftPayload({ ...emptyDraft(), title: 'X' });
    expect(payload.deadlineTime).toBeNull();
  });
});

describe('draftFromTask', () => {
  it('carries a chip duration in the chip field', () => {
    const draft = draftFromTask(makeTask({ scheduledDate: '2026-10-21', durationMin: 60 }));
    expect(draft.durationMin).toBe(60);
    expect(draft.customDuration).toBe('');
  });

  it('carries an off-chip duration in the custom field', () => {
    const draft = draftFromTask(makeTask({ scheduledDate: '2026-10-21', durationMin: 45 }));
    expect(draft.durationMin).toBe(30);
    expect(draft.customDuration).toBe('45');
  });

  it('defaults an unscheduled task to 30 minutes', () => {
    const draft = draftFromTask(makeTask());
    expect(draft.durationMin).toBe(30);
    expect(draft.customDuration).toBe('');
  });
});
