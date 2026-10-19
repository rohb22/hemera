import { migrate } from '@/db/migrate';
import { createHabitsRepository } from '@/repositories/habits';
import { createNodeSqlExecutor } from '../helpers/nodeSqlite';

async function setup() {
  const db = createNodeSqlExecutor();
  await migrate(db);
  let seq = 0;
  const repo = createHabitsRepository(db, {
    newId: () => `id-${++seq}`,
    now: () => 1_000_000 + seq,
  });
  return { db, repo };
}

describe('habitsRepository', () => {
  it('creates a habit with a trimmed name and lists it active', async () => {
    const { repo } = await setup();
    const created = await repo.create({ name: '  Drink water  ', daysMask: 21 });

    expect(created.name).toBe('Drink water');
    expect(created.daysMask).toBe(21);
    expect(created.archivedAt).toBeNull();

    expect(await repo.listActive()).toHaveLength(1);
    expect(await repo.listArchived()).toHaveLength(0);
  });

  it('rejects empty names and out-of-range day masks', async () => {
    const { repo } = await setup();
    await expect(repo.create({ name: '   ', daysMask: 21 })).rejects.toThrow();
    await expect(repo.create({ name: 'Walk', daysMask: 0 })).rejects.toThrow();
    await expect(repo.create({ name: 'Walk', daysMask: 128 })).rejects.toThrow();
    await expect(repo.listActive()).resolves.toHaveLength(0);
  });

  it('updates name and days, then archives and restores', async () => {
    const { repo } = await setup();
    const habit = await repo.create({ name: 'Stretch', daysMask: 1 });

    await repo.update(habit.id, { name: 'Stretch 10', daysMask: 3 });
    const updated = await repo.getById(habit.id);
    expect(updated?.name).toBe('Stretch 10');
    expect(updated?.daysMask).toBe(3);

    await repo.archive(habit.id);
    expect(await repo.listActive()).toHaveLength(0);
    const archived = await repo.listArchived();
    expect(archived.map((h) => h.id)).toEqual([habit.id]);

    await repo.restore(habit.id);
    expect(await repo.listActive()).toHaveLength(1);
    expect(await repo.listArchived()).toHaveLength(0);
  });

  it('lists habits newest first', async () => {
    const { repo } = await setup();
    const first = await repo.create({ name: 'First', daysMask: 127 });
    const second = await repo.create({ name: 'Second', daysMask: 127 });

    const active = await repo.listActive();
    expect(active.map((h) => h.id)).toEqual([second.id, first.id]);
  });
});

describe('habit occurrences (ADR-0007)', () => {
  it('upserts states but never deletes rows', async () => {
    const { repo } = await setup();
    const habit = await repo.create({ name: 'Read', daysMask: 127 });

    await repo.setOccurrence(habit.id, '2026-10-19', 'done');
    expect(await repo.getOccurrences(habit.id)).toHaveLength(1);

    await repo.setOccurrence(habit.id, '2026-10-19', 'pending');
    const rows = await repo.getOccurrences(habit.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.state).toBe('pending');

    await repo.setOccurrence(habit.id, '2026-10-19', 'skipped');
    const skipped = await repo.getOccurrences(habit.id);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.state).toBe('skipped');
  });

  it('keeps occurrences per habit and per date', async () => {
    const { repo } = await setup();
    const one = await repo.create({ name: 'One', daysMask: 127 });
    const two = await repo.create({ name: 'Two', daysMask: 127 });

    await repo.setOccurrence(one.id, '2026-10-19', 'done');
    await repo.setOccurrence(one.id, '2026-10-20', 'skipped');
    await repo.setOccurrence(two.id, '2026-10-19', 'done');

    expect(await repo.getOccurrences(one.id)).toHaveLength(2);
    expect(await repo.getOccurrences(two.id)).toHaveLength(1);
  });
});
