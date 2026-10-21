import { addDays, format } from 'date-fns';

import '../helpers/remindersMock';

import type { NewTaskInput, Task } from '@/domain/types';
import type { HabitsRepository } from '@/repositories/habits';
import type { SettingsRepository } from '@/repositories/settings';
import type { TasksRepository } from '@/repositories/tasks';
import { setServices } from '@/services';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';

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

function makeRepo() {
  return {
    create: jest.fn(async (input: NewTaskInput) =>
      makeTask({
        id: 'created',
        title: input.title.trim(),
        notes: input.notes ?? '',
        deadlineDate: input.deadlineDate ?? null,
        deadlineTime: input.deadlineTime ?? null,
        scheduledDate: input.scheduledDate ?? null,
        startTime: input.startTime ?? null,
        durationMin: input.durationMin ?? null,
      }),
    ),
    getById: jest.fn(async () => null),
    listOpen: jest.fn(async () => [] as Task[]),
    update: jest.fn(async () => undefined),
    complete: jest.fn(async () => undefined),
    uncomplete: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };
}

let repo: ReturnType<typeof makeRepo>;

beforeEach(() => {
  repo = makeRepo();
  setServices({
    tasks: repo as unknown as TasksRepository,
    habits: {} as HabitsRepository,
    settings: {} as SettingsRepository,
  });
  useTasksStore.setState({ status: 'idle', error: null, tasks: [] });
  useUiStore.getState().dismissToast();});

afterEach(() => {
  useUiStore.getState().dismissToast();
});

describe('createTask', () => {
  it('passes full attributes to the repository and prepends to state', async () => {
    const input: NewTaskInput = {
      title: '  Call the bank  ',
      notes: 'bring the card',
      scheduledDate: '2026-10-21',
      startTime: '09:30',
      durationMin: 45,
      deadlineDate: '2026-10-20',
      deadlineTime: null,
    };
    const created = await useTasksStore.getState().createTask(input);

    expect(repo.create).toHaveBeenCalledWith(input);
    expect(created.title).toBe('Call the bank');
    const state = useTasksStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].scheduledDate).toBe('2026-10-21');
    expect(state.tasks[0].durationMin).toBe(45);
  });

  it('propagates a failed write to the toast and rethrows', async () => {
    repo.create.mockRejectedValueOnce(new Error('disk full'));
    await expect(
      useTasksStore.getState().createTask({ title: 'X' }),
    ).rejects.toThrow('disk full');
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
    expect(useTasksStore.getState().tasks).toHaveLength(0);
  });
});

describe('updateTask', () => {
  it('reflects the patch in state immediately after the write', async () => {
    useTasksStore.setState({ tasks: [makeTask({ id: 'a', title: 'Old' })] });

    await useTasksStore.getState().updateTask('a', {
      title: 'New',
      deadlineDate: '2026-10-20',
      deadlineTime: '17:00',
    });

    expect(repo.update).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ deadlineDate: '2026-10-20', deadlineTime: '17:00' }),
    );
    const task = useTasksStore.getState().tasks[0];
    expect(task.title).toBe('New');
    expect(task.deadlineDate).toBe('2026-10-20');
    expect(task.deadlineTime).toBe('17:00');
  });

  it('leaves state untouched when the write fails, with a toast', async () => {
    useTasksStore.setState({ tasks: [makeTask({ id: 'a', title: 'Old' })] });
    repo.update.mockRejectedValueOnce(new Error('db locked'));

    await expect(
      useTasksStore.getState().updateTask('a', { title: 'New' }),
    ).rejects.toThrow('db locked');

    expect(useTasksStore.getState().tasks[0].title).toBe('Old');
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
  });
});

describe('scheduleTomorrow', () => {
  it('moves the task to tomorrow preserving start time and duration', async () => {
    useTasksStore.setState({
      tasks: [
        makeTask({ id: 'a', scheduledDate: '2026-10-19', startTime: '09:30', durationMin: 60 }),
      ],
    });
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    await useTasksStore.getState().scheduleTomorrow('a');

    expect(repo.update).toHaveBeenCalledWith('a', {
      scheduledDate: tomorrow,
      startTime: '09:30',
      durationMin: 60,
    });
    const task = useTasksStore.getState().tasks[0];
    expect(task.scheduledDate).toBe(tomorrow);
    expect(task.startTime).toBe('09:30');
  });

  it('does nothing for an unknown id', async () => {
    await useTasksStore.getState().scheduleTomorrow('missing');
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('clearSchedule', () => {
  it('clears schedule fields and keeps the deadline', async () => {
    useTasksStore.setState({
      tasks: [
        makeTask({
          id: 'a',
          scheduledDate: '2026-10-19',
          startTime: '09:30',
          durationMin: 45,
          deadlineDate: '2026-10-20',
          deadlineTime: '12:00',
        }),
      ],
    });

    await useTasksStore.getState().clearSchedule('a');

    const task = useTasksStore.getState().tasks[0];
    expect(task.scheduledDate).toBeNull();
    expect(task.startTime).toBeNull();
    expect(task.durationMin).toBeNull();
    expect(task.deadlineDate).toBe('2026-10-20');
    expect(task.deadlineTime).toBe('12:00');
  });
});

describe('removeTask', () => {
  it('permanently removes the task from the repository and state', async () => {
    useTasksStore.setState({ tasks: [makeTask({ id: 'a' }), makeTask({ id: 'b' })] });

    await useTasksStore.getState().removeTask('a');

    expect(repo.remove).toHaveBeenCalledWith('a');
    expect(useTasksStore.getState().tasks.map((t) => t.id)).toEqual(['b']);
  });

  it('keeps the task and shows a toast when the delete fails', async () => {
    useTasksStore.setState({ tasks: [makeTask({ id: 'a' })] });
    repo.remove.mockRejectedValueOnce(new Error('db locked'));

    await expect(useTasksStore.getState().removeTask('a')).rejects.toThrow('db locked');

    expect(useTasksStore.getState().tasks).toHaveLength(1);
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
  });
});

describe('completeTask', () => {
  it('removes the task from state and returns it for undo', async () => {
    const task = makeTask({ id: 'a' });
    useTasksStore.setState({ tasks: [task] });

    const returned = await useTasksStore.getState().completeTask('a');

    expect(returned).toEqual(task);
    expect(repo.complete).toHaveBeenCalledWith('a', expect.any(Number));
    expect(useTasksStore.getState().tasks).toHaveLength(0);
  });
});
