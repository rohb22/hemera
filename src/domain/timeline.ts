import type { Task } from './types';
import { scheduledEnd, scheduledStart } from './taskLabels';

export interface TimelineCluster {
  tasksPerLane: Task[][];
  laneCount: number;
}

interface Interval {
  task: Task;
  start: Date;
  end: Date;
}

export function clusterTimeline(tasks: Task[]): TimelineCluster[] {
  const intervals: Interval[] = [];
  for (const task of tasks) {
    const start = scheduledStart(task);
    const end = scheduledEnd(task);
    if (start && end) intervals.push({ task, start, end });
  }
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const clusters: Interval[][] = [];
  let current: Interval[] = [];
  let clusterEnd = 0;
  for (const item of intervals) {
    if (current.length === 0 || item.start.getTime() < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.end.getTime());
    } else {
      clusters.push(current);
      current = [item];
      clusterEnd = item.end.getTime();
    }
  }
  if (current.length > 0) clusters.push(current);

  return clusters.map((cluster) => {
    const lanes: Interval[][] = [];
    for (const item of cluster) {
      const lane = lanes.find((l) => l[l.length - 1].end.getTime() <= item.start.getTime());
      if (lane) lane.push(item);
      else lanes.push([item]);
    }
    return { tasksPerLane: lanes.map((l) => l.map((i) => i.task)), laneCount: lanes.length };
  });
}

export function clusterMarkerIndex(clusters: TimelineCluster[], now: Date): number {
  for (let i = 0; i < clusters.length; i++) {
    for (const lane of clusters[i].tasksPerLane) {
      for (const task of lane) {
        const start = scheduledStart(task);
        if (start && start.getTime() > now.getTime()) return i;
      }
    }
  }
  return clusters.length;
}

export function blockHeightMin(durationMin: number): number {
  if (durationMin <= 15) return 44;
  if (durationMin <= 30) return 52;
  if (durationMin <= 60) return 64;
  if (durationMin <= 90) return 76;
  return 88;
}
