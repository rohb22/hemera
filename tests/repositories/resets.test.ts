import { migrate } from '@/db/migrate';
import { planReset, resetCandidates } from '@/domain/reset';
import { createResetsRepository } from '@/repositories/resets';
import { createTasksRepository } from '@/repositories/tasks';
import type { Task } from '@/domain/types';
import { createNodeSqlExecutor } from '../helpers/nodeSqlite';

const NOW = new Date('2026-10-22T12:00:00');
const TODAY = '2026-10-22';

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
  return { db, tasks, resets };
}

async function carriedOver(tasks: ReturnType<typeof createTasksRepository>, title: string) {
  const created = await tasks.create({ title });
  await tasks.update(created.id, {
    scheduledDate: '2026-10-21',
    startTime: '09:00',
    durationMin: 30,
  });
  const open = await tasks.listOpen();
  return open.find((t) => t.id === created.id) as Task;
}

function planFor(tasks: Task[], choices: Record<string, { action: 'keep' | 'pool' | 'pick' | 'dismiss'; time?: string | null }>) {
  return planReset(resetCandidates(tasks, NOW), choices, TODAY);
}

describe('resetsRepository', () => {
  it('moves a carried-over task to today and records the history', async () => {
    const { tasks, resets } = await setup();
    const task = await carriedOver(tasks, 'Write the report');

    const outcome = await resets.apply(planFor([task], {}), TODAY);

    expect(outcome.changed).toBe(1);

    const moved = await tasks.getById(task.id);
    expect(moved?.scheduledDate).toBe(TODAY);
    expect(moved?.startTime).toBe('09:00');
    expect(moved?.durationMin).toBe(30);

    const records = await resets.listFor(TODAY);
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(outcome.resetId);

    const items = await resets.itemsFor(outcome.resetId);
    expect(items).toHaveLength(1);
    expect(items[0].taskId).toBe(task.id);
    expect(items[0].action).toBe('keep');
    expect(items[0].from).toEqual({
      scheduledDate: '2026-10-21',
      startTime: '09:00',
      durationMin: 30,
    });
    expect(items[0].to).toEqual({
      scheduledDate: TODAY,
      startTime: '09:00',
      durationMin: 30,
    });
  });

  it('clears the schedule of a task moved to the pool', async () => {
    const { tasks, resets } = await setup();
    const task = await carriedOver(tasks, 'Call mum');

    await resets.apply(planFor([task], { [task.id]: { action: 'pool' } }), TODAY);

    const pooled = await tasks.getById(task.id);
    expect(pooled?.scheduledDate).toBeNull();
    expect(pooled?.startTime).toBeNull();
    expect(pooled?.durationMin).toBeNull();
  });

  it('records a dismissal without touching the task', async () => {
    const { tasks, resets } = await setup();
    const task = await carriedOver(tasks, 'Read');

    const outcome = await resets.apply(planFor([task], { [task.id]: { action: 'dismiss' } }), TODAY);

    expect(outcome.changed).toBe(0);

    const untouched = await tasks.getById(task.id);
    expect(untouched?.scheduledDate).toBe('2026-10-21');

    const items = await resets.itemsFor(outcome.resetId);
    expect(items).toHaveLength(1);
    expect(items[0].action).toBe('dismiss');
  });

  it('applies every row in one transaction', async () => {
    const { tasks, resets } = await setup();
    const first = await carriedOver(tasks, 'First');
    const second = await carriedOver(tasks, 'Second');

    await resets.apply(
      planFor([first, second], { [first.id]: { action: 'keep' }, [second.id]: { action: 'pool' } }),
      TODAY,
    );

    expect((await tasks.getById(first.id))?.scheduledDate).toBe(TODAY);
    expect((await tasks.getById(second.id))?.scheduledDate).toBeNull();
  });

  it('restores every schedule on undo', async () => {
    const { tasks, resets } = await setup();
    const first = await carriedOver(tasks, 'First');
    const second = await carriedOver(tasks, 'Second');

    const outcome = await resets.apply(
      planFor([first, second], { [first.id]: { action: 'keep' }, [second.id]: { action: 'pool' } }),
      TODAY,
    );

    await resets.undo(outcome.resetId);

    expect((await tasks.getById(first.id))?.scheduledDate).toBe('2026-10-21');
    expect((await tasks.getById(first.id))?.startTime).toBe('09:00');
    expect((await tasks.getById(first.id))?.durationMin).toBe(30);
    expect((await tasks.getById(second.id))?.scheduledDate).toBe('2026-10-21');
    expect((await tasks.getById(second.id))?.startTime).toBe('09:00');
  });

  it('removes the history record on undo', async () => {
    const { tasks, resets } = await setup();
    const task = await carriedOver(tasks, 'First');

    const outcome = await resets.apply(planFor([task], {}), TODAY);
    await resets.undo(outcome.resetId);

    expect(await resets.listFor(TODAY)).toHaveLength(0);
    expect(await resets.itemsFor(outcome.resetId)).toHaveLength(0);
  });

  it('leaves every task untouched when one write fails', async () => {
    const { db, tasks, resets } = await setup();
    const task = await carriedOver(tasks, 'First');

    // Break the items table so the transaction fails after the task
    // update has already run inside it.
    await db.exec('DROP TABLE day_reset_items');

    await expect(resets.apply(planFor([task], {}), TODAY)).rejects.toThrow();

    const unchanged = await tasks.getById(task.id);
    expect(unchanged?.scheduledDate).toBe('2026-10-21');
  });
});
