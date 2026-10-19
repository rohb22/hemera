import { blockHeightMin, clusterMarkerIndex, clusterTimeline } from '@/domain/timeline';
import type { Task } from '@/domain/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    notes: '',
    deadlineDate: null,
    deadlineTime: null,
    scheduledDate: '2026-10-19',
    startTime: null,
    durationMin: null,
    status: 'open',
    createdAt: 0,
    completedAt: null,
    ...overrides,
  };
}

const t = (id: string, startTime: string, durationMin: number | null = null) =>
  makeTask({ id, startTime, durationMin });

describe('clusterTimeline (side-by-side equal lanes)', () => {
  it('puts a single task in one lane', () => {
    const clusters = clusterTimeline([t('a', '09:00', 60)]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].laneCount).toBe(1);
    expect(clusters[0].tasksPerLane[0].map((x) => x.id)).toEqual(['a']);
  });

  it('splits overlapping tasks into equal lanes', () => {
    const clusters = clusterTimeline([t('a', '09:00', 60), t('b', '09:30', 60)]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].laneCount).toBe(2);
    expect(clusters[0].tasksPerLane[0].map((x) => x.id)).toEqual(['a']);
    expect(clusters[0].tasksPerLane[1].map((x) => x.id)).toEqual(['b']);
  });

  it('keeps sequential tasks in one lane / separate clusters', () => {
    const clusters = clusterTimeline([t('a', '09:00', 60), t('b', '10:00', 60)]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].laneCount).toBe(1);
    expect(clusters[1].laneCount).toBe(1);
  });

  it('reuses a free lane for a later task in the same cluster', () => {
    const clusters = clusterTimeline([
      t('a', '09:00', 60),
      t('b', '09:30', 60),
      t('c', '10:15', 60),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].laneCount).toBe(2);
    expect(clusters[0].tasksPerLane[0].map((x) => x.id)).toEqual(['a', 'c']);
    expect(clusters[0].tasksPerLane[1].map((x) => x.id)).toEqual(['b']);
  });

  it('orders by start time regardless of input order', () => {
    const clusters = clusterTimeline([t('late', '16:00'), t('early', '09:00')]);
    expect(clusters.map((c) => c.tasksPerLane[0][0].id)).toEqual(['early', 'late']);
  });
});

describe('clusterMarkerIndex', () => {
  const now = new Date('2026-10-19T12:00:00');
  const build = (...tasks: Task[]) => clusterTimeline(tasks);

  it('is 0 when every task is in the future', () => {
    expect(clusterMarkerIndex(build(t('a', '14:00'), t('b', '15:00')), now)).toBe(0);
  });

  it('sits after clusters whose tasks have all started', () => {
    expect(clusterMarkerIndex(build(t('a', '09:00'), t('b', '14:00')), now)).toBe(1);
    expect(clusterMarkerIndex(build(t('a', '11:30', 60), t('b', '14:00')), now)).toBe(1);
  });

  it('is at the end when every task has started', () => {
    expect(clusterMarkerIndex(build(t('a', '09:00'), t('b', '11:00')), now)).toBe(2);
  });

  it('is 0 for an empty day', () => {
    expect(clusterMarkerIndex([], now)).toBe(0);
  });
});

describe('blockHeightMin (step-wise duration hint, not proportional)', () => {
  it('grows step-wise with duration and never explodes', () => {
    expect(blockHeightMin(15)).toBe(44);
    expect(blockHeightMin(30)).toBe(52);
    expect(blockHeightMin(60)).toBe(64);
    expect(blockHeightMin(90)).toBe(76);
    expect(blockHeightMin(480)).toBe(88);
    expect(blockHeightMin(1440)).toBe(88);
  });
});
