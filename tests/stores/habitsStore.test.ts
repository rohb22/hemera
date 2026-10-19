import type { Habit, HabitOccurrence, NewHabitInput } from '@/domain/types';
import type { HabitsRepository, HabitUpdate } from '@/repositories/habits';
import type { TasksRepository } from '@/repositories/tasks';
import { setServices } from '@/services';
import { useHabitsStore } from '@/stores/habitsStore';
import { useUiStore } from '@/stores/uiStore';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Stretch',
    daysMask: 21,
    createdAt: 1_000,
    archivedAt: null,
    ...overrides,
  };
}

function makeRepo() {
  return {
    create: jest.fn(async (input: NewHabitInput) =>
      makeHabit({ id: 'created', name: input.name.trim(), daysMask: input.daysMask }),
    ),
    getById: jest.fn(async () => null),
    listActive: jest.fn(async () => [] as Habit[]),
    listArchived: jest.fn(async () => [] as Habit[]),
    update: jest.fn(async (_id: string, _patch: HabitUpdate) => undefined),
    archive: jest.fn(async () => undefined),
    restore: jest.fn(async () => undefined),
    getOccurrences: jest.fn(async () => [] as HabitOccurrence[]),
    setOccurrence: jest.fn(async () => undefined),
  };
}

let repo: ReturnType<typeof makeRepo>;

beforeEach(() => {
  repo = makeRepo();
  setServices({ tasks: {} as TasksRepository, habits: repo as unknown as HabitsRepository });
  useHabitsStore.setState({ status: 'idle', error: null, habits: [], occurrences: [] });
  useUiStore.getState().dismissToast();
});

afterEach(() => {
  useUiStore.getState().dismissToast();
});

describe('load', () => {
  it('fills habits and their occurrences and marks ready', async () => {
    repo.listActive.mockResolvedValueOnce([makeHabit()]);
    repo.getOccurrences.mockResolvedValueOnce([
      { habitId: 'h1', date: '2026-10-19', state: 'done', updatedAt: 1 },
    ]);

    await useHabitsStore.getState().load();

    expect(repo.getOccurrences).toHaveBeenCalledWith('h1');
    const state = useHabitsStore.getState();
    expect(state.status).toBe('ready');
    expect(state.habits).toHaveLength(1);
    expect(state.occurrences).toHaveLength(1);
  });
});

describe('createHabit', () => {
  it('passes input to the repository and prepends to state', async () => {
    const created = await useHabitsStore.getState().createHabit({
      name: '  Drink water  ',
      daysMask: 127,
    });

    expect(repo.create).toHaveBeenCalledWith({ name: '  Drink water  ', daysMask: 127 });
    expect(created.name).toBe('Drink water');
    expect(useHabitsStore.getState().habits[0].id).toBe('created');
  });

  it('propagates a failed write to the toast and rethrows', async () => {
    repo.create.mockRejectedValueOnce(new Error('disk full'));
    await expect(
      useHabitsStore.getState().createHabit({ name: 'X', daysMask: 1 }),
    ).rejects.toThrow('disk full');
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
    expect(useHabitsStore.getState().habits).toHaveLength(0);
  });
});

describe('updateHabit', () => {
  it('reflects the patch in state after the write', async () => {
    useHabitsStore.setState({ habits: [makeHabit()] });

    await useHabitsStore.getState().updateHabit('h1', { name: 'Stretch daily', daysMask: 127 });

    expect(repo.update).toHaveBeenCalledWith('h1', { name: 'Stretch daily', daysMask: 127 });
    const habit = useHabitsStore.getState().habits[0];
    expect(habit.name).toBe('Stretch daily');
    expect(habit.daysMask).toBe(127);
  });
});

describe('archiveHabit', () => {
  it('drops the habit and only its occurrences from state', async () => {
    useHabitsStore.setState({
      habits: [makeHabit(), makeHabit({ id: 'h2', name: 'Read' })],
      occurrences: [
        { habitId: 'h1', date: '2026-10-19', state: 'done', updatedAt: 1 },
        { habitId: 'h2', date: '2026-10-19', state: 'pending', updatedAt: 1 },
      ],
    });

    await useHabitsStore.getState().archiveHabit('h1');

    expect(repo.archive).toHaveBeenCalledWith('h1');
    expect(useHabitsStore.getState().habits.map((h) => h.id)).toEqual(['h2']);
    expect(useHabitsStore.getState().occurrences.map((o) => o.habitId)).toEqual(['h2']);
  });
});

describe('setOccurrence', () => {
  it('replaces the same-date row instead of duplicating it', async () => {
    useHabitsStore.setState({
      occurrences: [{ habitId: 'h1', date: '2026-10-19', state: 'pending', updatedAt: 1 }],
    });

    await useHabitsStore.getState().setOccurrence('h1', '2026-10-19', 'done');

    expect(repo.setOccurrence).toHaveBeenCalledWith('h1', '2026-10-19', 'done');
    const rows = useHabitsStore.getState().occurrences;
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe('done');
  });

  it('leaves state untouched when the write fails, with a toast', async () => {
    useHabitsStore.setState({
      occurrences: [{ habitId: 'h1', date: '2026-10-19', state: 'pending', updatedAt: 1 }],
    });
    repo.setOccurrence.mockRejectedValueOnce(new Error('db locked'));

    await expect(
      useHabitsStore.getState().setOccurrence('h1', '2026-10-19', 'done'),
    ).rejects.toThrow('db locked');

    expect(useHabitsStore.getState().occurrences[0].state).toBe('pending');
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
  });
});
