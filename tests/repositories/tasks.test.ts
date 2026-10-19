import { migrate } from '@/db/migrate';
import { createTasksRepository } from '@/repositories/tasks';
import { createNodeSqlExecutor } from '../helpers/nodeSqlite';

async function setup() {
  const db = createNodeSqlExecutor();
  await migrate(db);
  let seq = 0;
  const repo = createTasksRepository(db, {
    newId: () => `id-${++seq}`,
    now: () => 1_000_000 + seq,
  });
  return { db, repo };
}

describe('tasksRepository', () => {
  it('creates and lists an open unscheduled task', async () => {
    const { repo } = await setup();
    const created = await repo.create({ title: '  Buy milk  ' });

    expect(created.title).toBe('Buy milk');
    expect(created.status).toBe('open');

    const open = await repo.listOpen();
    expect(open.map((t) => t.id)).toEqual([created.id]);
  });

  it('completes and uncompletes a task', async () => {
    const { repo } = await setup();
    const task = await repo.create({ title: 'Call mum' });

    await repo.complete(task.id, 1234);
    expect(await repo.listOpen()).toHaveLength(0);
    const done = await repo.getById(task.id);
    expect(done?.status).toBe('done');
    expect(done?.completedAt).toBe(1234);

    await repo.uncomplete(task.id);
    expect(await repo.listOpen()).toHaveLength(1);
  });

  it('updates schedule and deadline fields independently', async () => {
    const { repo } = await setup();
    const task = await repo.create({ title: 'Plan trip', deadlineDate: '2026-10-25' });

    await repo.update(task.id, {
      scheduledDate: '2026-10-20',
      startTime: '09:00',
      durationMin: 60,
    });
    const scheduled = await repo.getById(task.id);
    expect(scheduled?.scheduledDate).toBe('2026-10-20');
    expect(scheduled?.startTime).toBe('09:00');
    expect(scheduled?.durationMin).toBe(60);
    expect(scheduled?.deadlineDate).toBe('2026-10-25');

    await repo.update(task.id, { scheduledDate: null, startTime: null, durationMin: null });
    const cleared = await repo.getById(task.id);
    expect(cleared?.scheduledDate).toBeNull();
    expect(cleared?.startTime).toBeNull();
    expect(cleared?.durationMin).toBeNull();
    expect(cleared?.deadlineDate).toBe('2026-10-25');
  });

  it('update with an empty patch is a no-op', async () => {
    const { repo } = await setup();
    const task = await repo.create({ title: 'Untouched' });
    await repo.update(task.id, {});
    expect((await repo.getById(task.id))?.title).toBe('Untouched');
  });

  it('removes a task', async () => {
    const { repo } = await setup();
    const task = await repo.create({ title: 'Temp' });
    await repo.remove(task.id);
    expect(await repo.getById(task.id)).toBeNull();
  });

  it('rejects a blank title (CHECK constraint)', async () => {
    const { db, repo } = await setup();
    await expect(repo.create({ title: '   ' })).rejects.toThrow();
    expect(db).toBeTruthy();
  });

  it('rejects a deadline time without a deadline date', async () => {
    const { repo } = await setup();
    await expect(
      repo.create({ title: 'Nope', deadlineTime: '09:00' }),
    ).rejects.toThrow();
  });
});
