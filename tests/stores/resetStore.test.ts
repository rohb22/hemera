import '../helpers/remindersMock';

import { migrate } from '@/db/migrate';
import { planReset, resetCandidates } from '@/domain/reset';
import type { Task } from '@/domain/types';
import { createResetsRepository } from '@/repositories/resets';
import { createTasksRepository } from '@/repositories/tasks';
import type { HabitsRepository } from '@/repositories/habits';
import type { SettingsRepository } from '@/repositories/settings';
import { setServices } from '@/services';
import { useResetStore } from '@/stores/resetStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { createNodeSqlExecutor } from '../helpers/nodeSqlite';

/**
 * The Reset My Day store (v1.2, D26/FR-X4/FR-X6).
 *
 * The write itself is a single transaction in the repository; what the
 * store adds is keeping the in-memory tasks in step with it and
 * re-syncing the reminders, because a task that moved to today may need
 * a new trigger and a task that moved to the pool must lose its old one.
 */

const NOW = new Date('2026-10-22T12:00:00');
const TODAY = '2026-10-22';

function carriedOver(overrides: Partial<Task> = {}): Task {
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

function settingsRepo() {
  return {
    getWeekStartsOn: jest.fn(async () => 1),
    setWeekStartsOn: jest.fn(async () => undefined),
    getReminders: jest.fn(async () => ({
      tasks: false,
      habits: false,
      habitTime: '20:00',
      hintSeen: false,
    })),
    setReminderTasks: jest.fn(async () => undefined),
    setReminderHabits: jest.fn(async () => undefined),
    setHabitReminderTime: jest.fn(async () => undefined),
    setReminderHintSeen: jest.fn(async () => undefined),
  };
}

async function setup() {
  const db = createNodeSqlExecutor();
  await migrate(db);
  let seq = 0;
  const tasks = createTasksRepository(db, {
    newId: () => `id-${++seq}`,
    now: () => 1_000_000 + seq,
  });
  const resets = createResetsRepository(db, {
    newId: () => `reset-${++seq}`,
    now: () => 2_000_000 + seq,
  });
  setServices({
    tasks,
    habits: {} as HabitsRepository,
    settings: settingsRepo() as unknown as SettingsRepository,
    resets,
  });
  return { db, tasks, resets };
}

function planFor(tasks: Task[], choices: Record<string, { action: 'keep' | 'pool' | 'pick' | 'dismiss' }>) {
  return planReset(resetCandidates(tasks, NOW), choices, TODAY);
}

beforeEach(() => {
  useTasksStore.setState({ status: 'ready', error: null, tasks: [] });
  useUiStore.getState().dismissToast();
});

afterEach(() => {
  useUiStore.getState().dismissToast();
});

describe('reset store', () => {
  it('moves the carried-over task to today and keeps the store in step', async () => {
    const { tasks } = await setup();
    const task = carriedOver();
    useTasksStore.setState({ tasks: [task] });
    await tasks.create({ title: task.title });

    const outcome = await useResetStore.getState().apply(planFor([task], {}), TODAY);

    expect(outcome?.changed).toBe(1);

    const inStore = useTasksStore.getState().tasks[0];
    expect(inStore.scheduledDate).toBe(TODAY);
    expect(inStore.startTime).toBe('09:00');
    expect(inStore.durationMin).toBe(30);
  });

  it('clears the schedule of a task that was moved to the pool', async () => {
    const { tasks } = await setup();
    const task = carriedOver();
    useTasksStore.setState({ tasks: [task] });
    await tasks.create({ title: task.title });

    await useResetStore.getState().apply(planFor([task], { [task.id]: { action: 'pool' } }), TODAY);

    const inStore = useTasksStore.getState().tasks[0];
    expect(inStore.scheduledDate).toBeNull();
    expect(inStore.startTime).toBeNull();
    expect(inStore.durationMin).toBeNull();
  });

  it('restores the previous schedule on undo', async () => {
    const { tasks } = await setup();
    const task = carriedOver();
    useTasksStore.setState({ tasks: [task] });
    const created = await tasks.create({ title: task.title });
    await tasks.update(created.id, {
      scheduledDate: '2026-10-21',
      startTime: '09:00',
      durationMin: 30,
    });

    const outcome = await useResetStore.getState().apply(planFor([task], {}), TODAY);
    expect(outcome).not.toBeNull();

    await useResetStore.getState().undo(outcome!.resetId);

    const inStore = useTasksStore.getState().tasks.find((t) => t.title === 'Write the report');
    expect(inStore?.scheduledDate).toBe('2026-10-21');
    expect(inStore?.startTime).toBe('09:00');
  });

  it('reports a failed write instead of throwing', async () => {
    const { db, tasks } = await setup();
    const task = carriedOver();
    useTasksStore.setState({ tasks: [task] });
    await tasks.create({ title: task.title });

    // Break the history table so the transaction fails.
    await db.exec('DROP TABLE day_reset_items');

    const outcome = await useResetStore.getState().apply(planFor([task], {}), TODAY);

    expect(outcome).toBeNull();
    expect(useUiStore.getState().toast?.message).toBeTruthy();

    // Nothing moved.
    const inStore = useTasksStore.getState().tasks[0];
    expect(inStore.scheduledDate).toBe('2026-10-21');
  });

  it('counts nothing changed when every row is dismissed', async () => {
    const { tasks } = await setup();
    const task = carriedOver();
    useTasksStore.setState({ tasks: [task] });
    await tasks.create({ title: task.title });

    const outcome = await useResetStore.getState().apply(
      planFor([task], { [task.id]: { action: 'dismiss' } }),
      TODAY,
    );

    expect(outcome?.changed).toBe(0);
  });
});
